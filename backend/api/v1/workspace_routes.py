import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db

router = APIRouter(prefix="/auth", tags=["Auth Sync"])


class SyncWorkspaceRequest(BaseModel):
    supabase_user_id: str
    email: str
    full_name: Optional[str] = None
    workspace_name: Optional[str] = None
    slug: Optional[str] = None
    plan_mode: Optional[str] = "byok"


def _ensure_membership_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_email VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'owner',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(workspace_id, user_email)
            )
            """
        )
    )
    db.commit()


@router.post("/sync-workspace")
def sync_oauth_or_email_workspace(
    payload: SyncWorkspaceRequest,
    db: Session = Depends(get_db),
):
    _ensure_membership_table(db)
    email_clean = payload.email.strip().lower()

    existing = db.execute(
        text(
            """
            SELECT w.id, w.name, w.slug, w.is_active,
                   COALESCE(w.plan_mode, 'byok') AS plan_mode,
                   COALESCE(w.managed_approved, FALSE) AS managed_approved,
                   COALESCE(w.managed_request_status, 'none') AS managed_request_status,
                   COALESCE(w.industry, 'general_b2b') AS industry,
                   w.industry_config
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE LOWER(wm.user_email) = CAST(:email AS VARCHAR)
            ORDER BY w.created_at ASC
            LIMIT 1
            """
        ),
        {"email": email_clean},
    ).fetchone()

    if existing:
        wid = str(existing.id)
        return {
            "id": wid,
            "workspace_id": wid,
            "name": existing.name,
            "slug": existing.slug,
            "plan_mode": existing.plan_mode,
            "managed_approved": bool(existing.managed_approved),
            "managed_request_status": existing.managed_request_status,
            "industry": existing.industry,
            "industry_config": existing.industry_config or {},
        }

    new_wid = str(uuid.uuid4())
    display_name = (
        payload.workspace_name
        or (f"{payload.full_name} Workspace" if payload.full_name else None)
        or f"{email_clean.split('@')[0]} Workspace"
    )
    base_slug = (
        payload.slug
        or display_name.lower().replace(" ", "-")
    )
    unique_slug = f"{base_slug}-{new_wid[:6]}"
    requested_mode = (payload.plan_mode or "byok").lower()
    req_status = "pending" if requested_mode == "managed" else "none"

    db.execute(
        text(
            """
            INSERT INTO workspaces (id, name, slug, is_active, plan_mode, managed_approved, managed_request_status)
            VALUES (CAST(:wid AS UUID), :name, :slug, TRUE, 'byok', FALSE, :req_status)
            """
        ),
        {
            "wid": new_wid,
            "name": display_name,
            "slug": unique_slug,
            "req_status": req_status,
        },
    )

    db.execute(
        text(
            """
            INSERT INTO users (id, workspace_id, email, hashed_password, full_name, role)
            VALUES (CAST(:uid AS UUID), CAST(:wid AS UUID), CAST(:email AS VARCHAR), 'SUPABASE_AUTH_MANAGED', :full_name, 'admin')
            ON CONFLICT (email) DO NOTHING
            """
        ),
        {
            "uid": str(uuid.uuid4()),
            "wid": new_wid,
            "email": email_clean,
            "full_name": payload.full_name or display_name,
        },
    )

    db.execute(
        text(
            """
            INSERT INTO workspace_members (workspace_id, user_email, role)
            VALUES (CAST(:wid AS UUID), CAST(:email AS VARCHAR), 'owner')
            ON CONFLICT (workspace_id, user_email) DO NOTHING
            """
        ),
        {"wid": new_wid, "email": email_clean},
    )
    db.commit()

    return {
        "id": new_wid,
        "workspace_id": new_wid,
        "name": display_name,
        "slug": unique_slug,
        "plan_mode": "byok",
        "managed_approved": False,
        "managed_request_status": req_status,
        "industry": "general_b2b",
        "industry_config": {},
    }


@router.get("/my-workspaces")
def get_my_workspaces(email: str, db: Session = Depends(get_db)):
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    _ensure_membership_table(db)
    email_clean = email.strip().lower()

    # Backfill membership if user exists in users table
    db.execute(
        text(
            """
            INSERT INTO workspace_members (workspace_id, user_email, role)
            SELECT workspace_id, LOWER(email), COALESCE(role, 'owner')
            FROM users
            WHERE LOWER(email) = CAST(:email AS VARCHAR)
            ON CONFLICT (workspace_id, user_email) DO NOTHING
            """
        ),
        {"email": email_clean},
    )
    db.commit()

    rows = db.execute(
        text(
            """
            SELECT w.id, w.name, w.slug, w.is_active,
                   COALESCE(w.plan_mode, 'byok') AS plan_mode,
                   COALESCE(w.managed_approved, FALSE) AS managed_approved,
                   COALESCE(w.managed_request_status, 'none') AS managed_request_status,
                   COALESCE(w.industry, 'general_b2b') AS industry,
                   w.industry_config,
                   wm.role
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE LOWER(wm.user_email) = CAST(:email AS VARCHAR)
            ORDER BY w.created_at ASC
            """
        ),
        {"email": email_clean},
    ).fetchall()

    return {
        "workspaces": [
            {
                "id": str(r.id),
                "workspace_id": str(r.id),
                "name": r.name,
                "slug": r.slug,
                "is_active": bool(r.is_active),
                "plan_mode": r.plan_mode,
                "managed_approved": bool(r.managed_approved),
                "managed_request_status": r.managed_request_status,
                "industry": r.industry,
                "industry_config": r.industry_config if isinstance(r.industry_config, dict) else {},
                "role": r.role or "owner",
            }
            for r in rows
        ]
    }