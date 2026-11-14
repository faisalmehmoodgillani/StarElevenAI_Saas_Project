import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from sqlalchemy.orm import Session

from backend.agents.router import build_agent_graph
from backend.database.connection import get_db
from backend.schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    ThreadHistoryResponse,
)
from backend.database.checkpointer import (
    get_postgres_checkpointer,
    delete_thread_checkpoints,
)
from backend.services.plan_guard import enforce_workspace_llm_access

router = APIRouter(tags=["Multi-Agent Chat"])

# Compile LangGraph workflow once with Supabase PostgreSQL checkpointer
agent_graph = build_agent_graph(use_checkpointer=True)


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Executes the multi-agent LangGraph workflow synchronously and returns
    the final response along with the selected specialist agent.
    """
    access = enforce_workspace_llm_access(db, payload.workspace_id, payload.provider)
    resolved_encrypted_key = payload.encrypted_api_key or access.get("encrypted_api_key")
    resolved_provider = access.get("resolved_provider") or payload.provider

    try:
        scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "workspace_id": payload.workspace_id,
            "user_id": payload.user_id,
            "provider": resolved_provider,
            "model_name": payload.model_name,
            "encrypted_api_key": resolved_encrypted_key,
            "next_node": "",
        }

        final_state = agent_graph.invoke(initial_state, config=config)
        messages = final_state.get("messages", [])
        final_reply = messages[-1].content if messages else "No response generated."

        return ChatResponse(
            thread_id=payload.thread_id,
            workspace_id=payload.workspace_id,
            routed_agent=final_state.get("next_node", "general_agent"),
            response=str(final_reply),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


@router.post("/chat/stream")
def chat_stream_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Streams agent routing status and LLM response tokens in real time
    using Server-Sent Events (SSE).
    """
    access = enforce_workspace_llm_access(db, payload.workspace_id, payload.provider)
    resolved_encrypted_key = payload.encrypted_api_key or access.get("encrypted_api_key")
    resolved_provider = access.get("resolved_provider") or payload.provider

    scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
    config = {"configurable": {"thread_id": scoped_thread_id}}

    initial_state = {
        "messages": [HumanMessage(content=payload.message)],
        "workspace_id": payload.workspace_id,
        "user_id": payload.user_id,
        "provider": resolved_provider,
        "model_name": payload.model_name,
        "encrypted_api_key": resolved_encrypted_key,
        "next_node": "",
    }

    def event_generator():
        announced_agent = None
        try:
            for msg_chunk, metadata in agent_graph.stream(
                initial_state,
                config=config,
                stream_mode="messages",
            ):
                node_name = metadata.get("langgraph_node", "")

                # Skip internal structured JSON output from the intent router node
                if node_name == "router":
                    continue

                # Notify client once when a specialist agent starts executing
                if node_name and node_name != announced_agent:
                    announced_agent = node_name
                    status_event = json.dumps({"type": "status", "agent": node_name})
                    yield f"data: {status_event}\n\n"

                # Stream only AI assistant text chunks
                msg_type = getattr(msg_chunk, "type", "")
                content = getattr(msg_chunk, "content", "")
                if msg_type in ("AIMessageChunk", "ai") and content:
                    token_event = json.dumps({"type": "token", "content": content})
                    yield f"data: {token_event}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            error_event = json.dumps({"type": "error", "detail": str(e)})
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/threads/{workspace_id}/{thread_id}/history", response_model=ThreadHistoryResponse)
def get_thread_history(workspace_id: str, thread_id: str):
    """Fetches persisted conversation messages from Supabase PostgreSQL checkpointer."""
    try:
        scoped_thread_id = f"{workspace_id}:{thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}
        state_snapshot = agent_graph.get_state(config)

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
                        "content": msg.content,
                    }
                )

        return ThreadHistoryResponse(
            thread_id=thread_id,
            workspace_id=workspace_id,
            last_routed_agent=state_snapshot.values.get("next_node"),
            messages=formatted_messages,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")


@router.delete("/threads/{workspace_id}/{thread_id}")
def delete_conversation_thread(workspace_id: str, thread_id: str):
    """Deletes all Supabase LangGraph checkpoint records for a workspace thread."""
    try:
        result = delete_thread_checkpoints(
            workspace_id=workspace_id,
            thread_id=thread_id,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete thread checkpoints: {str(e)}",
        )