import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.agents.scoped_graph import (
    build_scoped_execution_graph,
    detect_missing_tool_intent,
)
from backend.database.checkpointer import delete_thread_checkpoints, get_async_checkpointer
from backend.database.connection import get_db
from backend.schemas.chat_schema import ChatResponse, ThreadHistoryResponse
from backend.services.plan_guard import (
    enforce_workspace_llm_access,
    record_workspace_token_usage,
)

router = APIRouter(tags=["Multi-Agent Chat"])


class ScopedChatRequest(BaseModel):
    message: str
    thread_id: str
    workspace_id: str
    user_id: str
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"
    encrypted_api_key: Optional[str] = None
    pinned_agent_ids: Optional[List[str]] = None
    pinned_tool_ids: Optional[List[str]] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ScopedChatRequest, db: Session = Depends(get_db)):
    access = enforce_workspace_llm_access(
        db, payload.workspace_id, payload.provider, payload.user_id
    )
    resolved_encrypted_key = payload.encrypted_api_key or access.get("encrypted_api_key")
    resolved_provider = access.get("resolved_provider") or payload.provider

    try:
        graph, _ = await build_scoped_execution_graph(
            db=db,
            workspace_id=payload.workspace_id,
            thread_id=payload.thread_id,
            override_agent_ids=payload.pinned_agent_ids,
            override_tool_ids=payload.pinned_tool_ids,
        )
        scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "workspace_id": payload.workspace_id,
            "user_id": payload.user_id,
            "provider": resolved_provider,
            "model_name": payload.model_name,
            "encrypted_api_key": resolved_encrypted_key,
            "active_agent_slug": "",
            "active_agent_name": "",
        }

        final_state = await graph.ainvoke(initial_state, config=config)
        messages = final_state.get("messages", [])
        final_reply = messages[-1].content if messages else "No response generated."

        record_workspace_token_usage(
            db,
            payload.workspace_id,
            fallback_text=f"{payload.message}\n{final_reply}",
        )

        return ChatResponse(
            thread_id=payload.thread_id,
            workspace_id=payload.workspace_id,
            routed_agent=final_state.get("active_agent_slug") or "general_copilot",
            response=str(final_reply),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


@router.post("/chat/stream")
async def chat_stream_endpoint(payload: ScopedChatRequest, db: Session = Depends(get_db)):
    """
    Non-blocking async SSE stream supporting user-pinned agents/tools,
    missing-tool advisor hints, tool execution telemetry, and HITL interrupts.
    """
    access = enforce_workspace_llm_access(
        db, payload.workspace_id, payload.provider, payload.user_id
    )
    resolved_encrypted_key = payload.encrypted_api_key or access.get("encrypted_api_key")
    resolved_provider = access.get("resolved_provider") or payload.provider

    graph, connectors_catalog = await build_scoped_execution_graph(
        db=db,
        workspace_id=payload.workspace_id,
        thread_id=payload.thread_id,
        override_agent_ids=payload.pinned_agent_ids,
        override_tool_ids=payload.pinned_tool_ids,
    )

    missing_tool_hint = detect_missing_tool_intent(payload.message, connectors_catalog)
    scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
    config = {"configurable": {"thread_id": scoped_thread_id}}

    initial_state = {
        "messages": [HumanMessage(content=payload.message)],
        "workspace_id": payload.workspace_id,
        "user_id": payload.user_id,
        "provider": resolved_provider,
        "model_name": payload.model_name,
        "encrypted_api_key": resolved_encrypted_key,
        "active_agent_slug": "",
        "active_agent_name": "",
    }

    async def event_generator():
        announced_node = None
        streamed_chunks: list[str] = []
        try:
            if missing_tool_hint:
                yield f"data: {json.dumps({'type': 'missing_tool', 'connector': missing_tool_hint})}\n\n"

            async for msg_chunk, metadata in graph.astream(
                initial_state,
                config=config,
                stream_mode="messages",
            ):
                node_name = metadata.get("langgraph_node", "")
                if node_name == "coordinator":
                    continue

                if node_name and node_name != announced_node:
                    announced_node = node_name
                    yield f"data: {json.dumps({'type': 'status', 'agent': node_name})}\n\n"

                msg_type = getattr(msg_chunk, "type", "")
                content = getattr(msg_chunk, "content", "")

                # Emit tool call indicators so UI can display live tool execution badges
                tool_calls = getattr(msg_chunk, "tool_calls", None) or []
                for tc in tool_calls:
                    if tc.get("name"):
                        yield f"data: {json.dumps({'type': 'tool_call', 'tool': tc['name']})}\n\n"

                if msg_type in ("AIMessageChunk", "ai") and content:
                    text_part = str(content)
                    streamed_chunks.append(text_part)
                    yield f"data: {json.dumps({'type': 'token', 'content': text_part})}\n\n"

            # Check if graph paused on a LangGraph HITL interrupt()
            state_snapshot = await graph.aget_state(config)
            if state_snapshot and state_snapshot.tasks:
                for task in state_snapshot.tasks:
                    interrupts = getattr(task, "interrupts", None) or []
                    for intr in interrupts:
                        intr_payload = getattr(intr, "value", intr)
                        yield f"data: {json.dumps({'type': 'hitl_interrupt', 'interrupt': intr_payload})}\n\n"

            record_workspace_token_usage(
                db,
                payload.workspace_id,
                fallback_text=f"{payload.message}\n{''.join(streamed_chunks)}",
            )
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/threads/{workspace_id}/{thread_id}/history", response_model=ThreadHistoryResponse)
async def get_thread_history(workspace_id: str, thread_id: str):
    """Fetches persisted conversation messages asynchronously from PostgreSQL checkpointer."""
    try:
        from langgraph.graph import StateGraph
        from backend.agents.scoped_graph import ScopedAgentState

        checkpointer = await get_async_checkpointer()
        dummy = StateGraph(ScopedAgentState).compile(checkpointer=checkpointer)
        scoped_thread_id = f"{workspace_id}:{thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}
        state_snapshot = await dummy.aget_state(config)

        if not state_snapshot or not state_snapshot.values:
            return ThreadHistoryResponse(
                thread_id=thread_id,
                workspace_id=workspace_id,
                last_routed_agent=None,
                messages=[],
            )

        formatted_messages = []
        for msg in state_snapshot.values.get("messages", []):
            msg_type = getattr(msg, "type", "unknown")
            if msg_type in ("human", "ai") and getattr(msg, "content", ""):
                formatted_messages.append(
                    {
                        "role": "user" if msg_type == "human" else "assistant",
                        "content": str(msg.content),
                    }
                )

        return ThreadHistoryResponse(
            thread_id=thread_id,
            workspace_id=workspace_id,
            last_routed_agent=state_snapshot.values.get("active_agent_slug"),
            messages=formatted_messages,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")


@router.delete("/threads/{workspace_id}/{thread_id}")
def delete_conversation_thread(workspace_id: str, thread_id: str):
    try:
        return delete_thread_checkpoints(
            workspace_id=workspace_id,
            thread_id=thread_id,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete thread checkpoints: {str(e)}",
        )