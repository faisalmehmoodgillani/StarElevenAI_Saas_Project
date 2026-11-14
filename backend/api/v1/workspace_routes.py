import json
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.workspace_schema import (
    WorkspaceCreateRequest,
    WorkspaceCreateResponse,
    WorkspaceListResponse,
    WorkspaceSummaryItem,
    WorkspaceUpdateRequest,
)
from backend.services.tenant_service import create_workspace_with_admin
from backend.services.email_service import send_managed_plan_request_alert

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def _verify_super_admin(admin_email: str | None) -> None:
    allowed_raw = os.getenv("SUPER_ADMIN_EMAILS", "")
    allowed = {e.strip().lower() for e in allowed_raw.split(",") if e.strip()}
    if not allowed:
        return
    if not admin_email or admin_email.strip().lower() not in allowed:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Super-Admin privileges required.",
        )


def _ensure_plan_columns(db: Session) -> None:
    db.execute(
        text(
            """
            ALTER TABLE workspaces
            ADD COLUMN IF NOT EXISTS plan_mode VARCHAR(20) DEFAULT 'byok',
            ADD COLUMN IF NOT EXISTS managed_approved BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS managed_request_status VARCHAR(20) DEFAULT 'none'
            """
        )
    )
    db.commit()


@router.post("", response_model=WorkspaceCreateResponse)
def register_workspace(payload: WorkspaceCreateRequest, db: Session = Depends(get_db)):
    _ensure_plan_columns(db)
    try:
        result = create_workspace_with_admin(
            db=db,
            workspace_name=payload.name,
            slug=payload.slug,
            admin_email=payload.owner_email,
            admin_password=payload.admin_password or "SUPABASE_AUTH_MANAGED",
            admin_full_name=payload.admin_full_name,
        )
        wid = result["workspace_id"]
        requested_mode = (payload.plan_mode or "byok").lower()
        req_status = "pending" if requested_mode == "managed" else "none"

        db.execute(
            text(
                """
                UPDATE workspaces
                SET plan_mode = 'byok',
                    managed_approved = FALSE,
                    managed_request_status = :req_status
                WHERE id = CAST(:wid AS UUID)
                """
            ),
            {"wid": wid, "req_status": req_status},
        )
        db.commit()

        if req_status == "pending":
            send_managed_plan_request_alert(
                workspace_id=wid,
                workspace_name=result["workspace_name"],
                workspace_slug=result["slug"],
                requester_email=payload.owner_email or "Unknown",
            )

        return WorkspaceCreateResponse(
            id=wid,
            workspace_id=wid,
            name=result["workspace_name"],
            workspace_name=result["workspace_name"],
            slug=result["slug"],
            plan_mode="byok",
            managed_approved=False,
            managed_request_status=req_status,
            admin_user_id=result.get("admin_user_id"),
            admin_email=result["admin_email"],
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")


@router.get("", response_model=WorkspaceListResponse)
def get_all_workspaces(db: Session = Depends(get_db)):
    _ensure_plan_columns(db)
    rows = db.execute(
        text(
            """
            SELECT id, name, slug, is_active,
                   COALESCE(plan_mode, 'byok') AS plan_mode,
                   COALESCE(managed_approved, FALSE) AS managed_approved,
                   COALESCE(managed_request_status, 'none') AS managed_request_status,
                   COALESCE(industry, 'general_b2b') AS industry,
                   industry_config
            FROM workspaces
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    items = [
        WorkspaceSummaryItem(
            id=str(r.id),
            workspace_id=str(r.id),
            name=r.name,
            slug=r.slug,
            is_active=bool(r.is_active),
            plan_mode=r.plan_mode,
            managed_approved=bool(r.managed_approved),
            managed_request_status=r.managed_request_status,
            industry=r.industry,
            industry_config=r.industry_config if isinstance(r.industry_config, dict) else {},
        )
        for r in rows
    ]
    return WorkspaceListResponse(workspaces=items)


@router.patch("/{workspace_id}")
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdateRequest,
    x_user_email: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _ensure_plan_columns(db)
    try:
        uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace UUID")

    row = db.execute(
        text(
            """
            SELECT id, name, slug,
                   COALESCE(plan_mode, 'byok') AS plan_mode,
                   COALESCE(managed_approved, FALSE) AS managed_approved,
                   COALESCE(managed_request_status, 'none') AS managed_request_status
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")

    new_name = payload.name.strip() if payload.name else row.name
    new_slug = payload.slug.strip() if payload.slug else row.slug
    is_approved = bool(row.managed_approved)
    new_plan_mode = row.plan_mode
    new_req_status = payload.managed_request_status or row.managed_request_status
    notify_admin = False

    if payload.plan_mode:
        requested = payload.plan_mode.lower().strip()
        if requested == "byok":
            new_plan_mode = "byok"
        elif requested == "managed":
            if is_approved:
                new_plan_mode = "managed"
                new_req_status = "approved"
            else:
                new_plan_mode = "byok"
                new_req_status = "pending"
                notify_admin = True

    try:
        db.execute(
            text(
                """
                UPDATE workspaces
                SET name = :name,
                    slug = :slug,
                    plan_mode = :plan_mode,
                    managed_request_status = :req_status,
                    industry = COALESCE(:industry, industry),
                    industry_config = COALESCE(CAST(:industry_config AS JSONB), industry_config)
                WHERE id = CAST(:wid AS UUID)
                """
            ),
            {
                "wid": workspace_id,
                "name": new_name,
                "slug": new_slug,
                "plan_mode": new_plan_mode,
                "req_status": new_req_status,
                "industry": payload.industry,
                "industry_config": (
                    json.dumps(payload.industry_config)
                    if payload.industry_config is not None
                    else None
                ),
            },
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Update failed: {str(e)}")

    if notify_admin:
        send_managed_plan_request_alert(
            workspace_id=workspace_id,
            workspace_name=new_name,
            workspace_slug=new_slug,
            requester_email=x_user_email or "Workspace Owner",
        )

    return {
        "id": workspace_id,
        "workspace_id": workspace_id,
        "name": new_name,
        "slug": new_slug,
        "plan_mode": new_plan_mode,
        "managed_approved": is_approved,
        "managed_request_status": new_req_status,
    }


@router.get("/admin/overview")
def admin_workspaces_overview(
    x_admin_email: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Super-Admin endpoint listing all workspaces and their Managed Plan approval states."""
    _verify_super_admin(x_admin_email)
    _ensure_plan_columns(db)

    rows = db.execute(
        text(
            """
            SELECT w.id,
                   w.name,
                   w.slug,
                   w.created_at,
                   COALESCE(w.plan_mode, 'byok') AS plan_mode,
                   COALESCE(w.managed_approved, FALSE) AS managed_approved,
                   COALESCE(w.managed_request_status, 'none') AS managed_request_status,
                   COALESCE(
                       (SELECT u.email FROM users u WHERE u.workspace_id = w.id LIMIT 1),
                       'unknown@client.com'
                   ) AS owner_email
            FROM workspaces w
            ORDER BY
                CASE WHEN COALESCE(w.managed_request_status, 'none') = 'pending' THEN 0 ELSE 1 END,
                w.created_at DESC
            """
        )
    ).fetchall()

    return {
        "workspaces": [
            {
                "id": str(r.id),
                "name": r.name,
                "slug": r.slug,
                "owner_email": r.owner_email,
                "plan_mode": r.plan_mode,
                "managed_approved": bool(r.managed_approved),
                "managed_request_status": r.managed_request_status,
                "created_at": str(r.created_at) if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/{workspace_id}/approve-managed")
def approve_managed_plan(
    workspace_id: str,
    x_admin_email: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Super-Admin approves a workspace for Fully Managed cloud execution."""
    _verify_super_admin(x_admin_email)
    _ensure_plan_columns(db)
    try:
        uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace UUID")

    db.execute(
        text(
            """
            UPDATE workspaces
            SET managed_approved = TRUE,
                managed_request_status = 'approved',
                plan_mode = 'managed'
            WHERE id = CAST(:wid AS UUID)
            """
        ),
        {"wid": workspace_id},
    )
    db.commit()
    return {
        "workspace_id": workspace_id,
        "managed_approved": True,
        "managed_request_status": "approved",
        "plan_mode": "managed",
    }


@router.post("/{workspace_id}/reject-managed")
def reject_managed_plan(
    workspace_id: str,
    x_admin_email: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Super-Admin revokes or declines Managed Plan access and sets workspace back to BYOK."""
    _verify_super_admin(x_admin_email)
    _ensure_plan_columns(db)
    try:
        uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace UUID")

    db.execute(
        text(
            """
            UPDATE workspaces
            SET managed_approved = FALSE,
                managed_request_status = 'rejected',
                plan_mode = 'byok'
            WHERE id = CAST(:wid AS UUID)
            """
        ),
        {"wid": workspace_id},
    )
    db.commit()
    return {
        "workspace_id": workspace_id,
        "managed_approved": False,
        "managed_request_status": "rejected",
        "plan_mode": "byok",
    }