import os
import sys
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.services.tenant_service import (
    create_workspace_with_admin,
    create_agent_configuration,
    list_workspaces,
)

# Ensure project root is on sys.path for reliable module resolution
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.config import settings
from backend.agents.router import build_agent_graph

app = FastAPI(
    title=getattr(settings, "PROJECT_NAME", "StarEleven AI SaaS Platform"),
    version=getattr(settings, "VERSION", "1.0.0"),
    description="Multi-Tenant Agentic AI SaaS Backend powered by FastAPI, LangGraph, and Supabase.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile LangGraph workflow with Supabase PostgreSQL checkpointer
agent_graph = build_agent_graph(use_checkpointer=True)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt or query")
    thread_id: str = Field(..., min_length=1, description="Conversation session/thread ID")
    workspace_id: str = Field(..., min_length=1, description="Tenant workspace UUID")
    user_id: str = Field(..., min_length=1, description="Authenticated user UUID")
    provider: str = Field(default="groq", description="LLM provider: groq, google, openai, anthropic, openrouter")
    model_name: str = Field(default="llama-3.3-70b-versatile", description="Target model identifier")
    encrypted_api_key: Optional[str] = Field(default=None, description="Optional workspace encrypted API key")


class ChatResponse(BaseModel):
    thread_id: str
    workspace_id: str
    routed_agent: str
    response: str


@app.get("/")
def health_check():
    """Root health check endpoint."""
    return {
        "status": "online",
        "project": getattr(settings, "PROJECT_NAME", "StarEleven AI SaaS Platform"),
        "version": getattr(settings, "VERSION", "1.0.0"),
    }


@app.post("/api/v1/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    """
    Executes the multi-agent LangGraph workflow synchronously and returns
    the final response along with the selected specialist agent.
    """
    try:
        # Scope thread_id with workspace_id to enforce strict tenant state isolation
        scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "workspace_id": payload.workspace_id,
            "user_id": payload.user_id,
            "provider": payload.provider,
            "model_name": payload.model_name,
            "encrypted_api_key": payload.encrypted_api_key,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


@app.post("/api/v1/chat/stream")
def chat_stream_endpoint(payload: ChatRequest):
    """
    Streams agent routing status and LLM response tokens in real time
    using Server-Sent Events (SSE).
    """
    scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
    config = {"configurable": {"thread_id": scoped_thread_id}}

    initial_state = {
        "messages": [HumanMessage(content=payload.message)],
        "workspace_id": payload.workspace_id,
        "user_id": payload.user_id,
        "provider": payload.provider,
        "model_name": payload.model_name,
        "encrypted_api_key": payload.encrypted_api_key,
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

                # Stream only AI assistant text chunks (exclude raw ToolMessage outputs)
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


@app.get("/api/v1/threads/{workspace_id}/{thread_id}/history")
def get_thread_history(workspace_id: str, thread_id: str):
    """Fetches persisted conversation messages from Supabase PostgreSQL checkpointer."""
    try:
        scoped_thread_id = f"{workspace_id}:{thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}
        state_snapshot = agent_graph.get_state(config)

        if not state_snapshot or not state_snapshot.values:
            return {"thread_id": thread_id, "workspace_id": workspace_id, "messages": []}

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

        return {
            "thread_id": thread_id,
            "workspace_id": workspace_id,
            "last_routed_agent": state_snapshot.values.get("next_node"),
            "messages": formatted_messages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

class WorkspaceCreateRequest(BaseModel):
    workspace_name: str = Field(..., min_length=2, example="StarEleven Agency")
    slug: str = Field(..., min_length=2, example="stareleven-agency")
    admin_email: str = Field(..., example="admin@stareleven.ai")
    admin_password: str = Field(..., min_length=6, example="StrongPass123!")
    admin_full_name: Optional[str] = Field(default="Faisal Mehmood")


class AgentConfigCreateRequest(BaseModel):
    workspace_id: str = Field(..., description="Target workspace UUID")
    agent_type: str = Field(..., example="crm_agent")
    provider: str = Field(default="groq", example="groq")
    model_name: str = Field(default="llama-3.3-70b-versatile", example="llama-3.3-70b-versatile")
    api_key: Optional[str] = Field(default=None, description="Plain API key (will be AES-256 encrypted before DB save)")
    settings_json: Optional[dict] = Field(default_factory=dict)


@app.post("/api/v1/workspaces")
def register_workspace(payload: WorkspaceCreateRequest, db: Session = Depends(get_db)):
    """Creates a new tenant workspace and admin user in Supabase."""
    try:
        return create_workspace_with_admin(
            db=db,
            workspace_name=payload.workspace_name,
            slug=payload.slug,
            admin_email=payload.admin_email,
            admin_password=payload.admin_password,
            admin_full_name=payload.admin_full_name,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")


@app.get("/api/v1/workspaces")
def get_all_workspaces(db: Session = Depends(get_db)):
    """Lists all workspaces from Supabase."""
    return {"workspaces": list_workspaces(db)}


@app.post("/api/v1/agents")
def register_agent_config(payload: AgentConfigCreateRequest, db: Session = Depends(get_db)):
    """Creates a workspace agent config with encrypted API key storage."""
    try:
        return create_agent_configuration(
            db=db,
            workspace_id=payload.workspace_id,
            agent_type=payload.agent_type,
            provider=payload.provider,
            model_name=payload.model_name,
            plain_api_key=payload.api_key,
            settings_json=payload.settings_json,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent config: {str(e)}")