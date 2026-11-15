from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from langgraph.types import Command
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.agents.scoped_graph import build_scoped_execution_graph
from backend.database.connection import get_db
from backend.services.plan_guard import record_workspace_token_usage

router = APIRouter(prefix="/hitl", tags=["Human-in-the-Loop Approvals"])


class HitlResumeRequest(BaseModel):
    workspace_id: str
    thread_id: str
    approved: bool
    reason: Optional[str] = None


@router.post("/resume")
async def resume_hitl_action(payload: HitlResumeRequest, db: Session = Depends(get_db)):
    """
    Resumes a paused LangGraph execution after the human approves or rejects
    a sensitive external action (Gmail send, Calendar booking, Slack, WhatsApp).
    """
    try:
        graph, _ = await build_scoped_execution_graph(
            db=db,
            workspace_id=payload.workspace_id,
            thread_id=payload.thread_id,
        )
        scoped_thread_id = f"{payload.workspace_id}:{payload.thread_id}"
        config = {"configurable": {"thread_id": scoped_thread_id}}

        final_state = await graph.ainvoke(
            Command(resume={"approved": payload.approved, "reason": payload.reason}),
            config=config,
        )
        messages = final_state.get("messages", [])
        final_reply = messages[-1].content if messages else "Action processed."

        record_workspace_token_usage(
            db,
            payload.workspace_id,
            fallback_text=str(final_reply),
        )

        return {
            "status": "approved_and_executed" if payload.approved else "rejected",
            "thread_id": payload.thread_id,
            "response": str(final_reply),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HITL resume failed: {str(e)}")