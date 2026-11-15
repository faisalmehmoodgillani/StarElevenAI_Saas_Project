import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import ChatThreadScope

router = APIRouter(prefix="/thread-scope", tags=["Chat Thread Scoping"])


class UpdateThreadScopeRequest(BaseModel):
    pinned_agent_ids: List[str] = Field(default_factory=list)
    pinned_tool_ids: List[str] = Field(default_factory=list)


@router.get("/{workspace_id}/{thread_id}")
def get_thread_scope(workspace_id: str, thread_id: str, db: Session = Depends(get_db)):
    wid = uuid.UUID(str(workspace_id))
    row = (
        db.query(ChatThreadScope)
        .filter(
            ChatThreadScope.workspace_id == wid,
            ChatThreadScope.thread_id == thread_id,
        )
        .first()
    )
    return {
        "workspace_id": workspace_id,
        "thread_id": thread_id,
        "pinned_agent_ids": list(row.pinned_agent_ids or []) if row else [],
        "pinned_tool_ids": list(row.pinned_tool_ids or []) if row else [],
    }


@router.put("/{workspace_id}/{thread_id}")
def save_thread_scope(
    workspace_id: str,
    thread_id: str,
    payload: UpdateThreadScopeRequest,
    db: Session = Depends(get_db),
):
    """Locks any user-selected list of agents and tools to this specific chat thread."""
    try:
        wid = uuid.UUID(str(workspace_id))
        clean_agents = list(dict.fromkeys([a.strip() for a in payload.pinned_agent_ids if a.strip()]))
        clean_tools = list(dict.fromkeys([t.strip() for t in payload.pinned_tool_ids if t.strip()]))

        row = (
            db.query(ChatThreadScope)
            .filter(
                ChatThreadScope.workspace_id == wid,
                ChatThreadScope.thread_id == thread_id,
            )
            .first()
        )
        if row:
            row.pinned_agent_ids = clean_agents
            row.pinned_tool_ids = clean_tools
        else:
            row = ChatThreadScope(
                workspace_id=wid,
                thread_id=thread_id,
                pinned_agent_ids=clean_agents,
                pinned_tool_ids=clean_tools,
            )
            db.add(row)

        db.commit()
        return {
            "status": "saved",
            "workspace_id": workspace_id,
            "thread_id": thread_id,
            "pinned_agent_ids": clean_agents,
            "pinned_tool_ids": clean_tools,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save thread scope: {str(e)}")