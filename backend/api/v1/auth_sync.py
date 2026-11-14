import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db

router = APIRouter(prefix="/auth", tags=["Supabase Auth Sync"])


class SyncWorkspacePayload(BaseModel):
    supabase_user_id: Optional[str] = None
    email: str
    full_name: Optional[str] = None
    workspace_name: Optional[str] = None
    slug: Optional[str] = None
    plan_mode: Optional[str] = "byok"


def _ensure_tables_and_columns(db: Session) -> None:
    db.execute(
        text(
            """
            ALTER TABLE workspaces
            ADD COLUMN IF NOT EXISTS plan_mode VARCHAR(32) NOT NULL DEFAULT 'byok';
            """
        )
    )
    db.execute(
        text(
            """
            ALTER TABLE workspaces
            ADD COLUMN IF NOT EXISTS managed_approved BOOLEAN NOT NULL DEFAULT FALSE;
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_email VARCHAR(255) NOT NULL,
                user_id UUID NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'operator',
                status VARCHAR(50) NOT NULL DEFAULT 'invited',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (workspace_id, user_email)
            );
            """
        )
    )


def _make_unique_slug(db: Session, base_slug: str) -> str:
    clean = (
        base_slug.lower()
        .strip()
        .replace(" ", "-")
        .replace("_", "-")
    )
    clean = "".join(ch for ch in clean if ch.isalnum() or ch == "-").strip("-") or "workspace"
    candidate = clean
    counter = 1
    while db.execute(
        text("SELECT 1 FROM workspaces WHERE slug = :s LIMIT 1"),
        {"s": candidate},
    ).fetchone():
        counter += 1
        candidate = f"{clean}-{counter}"
    return candidate


@router.post("/sync-workspace")
def sync_workspace(payload: SyncWorkspacePayload, db: Session = Depends(get_db)):
    clean_email = (payload.email or "").strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Email is required.")

    _ensure_tables_and_columns(db)

    # 1. Check if user is an invited/active member of any existing workspace
    member_row = db.execute(
        text(
            """
            SELECT wm.workspace_id, wm.role, w.name, w.slug, w.plan_mode
            FROM workspace_members wm
            JOIN workspaces w ON w.id = wm.workspace_id
            WHERE LOWER(wm.user_email) = CAST(:email AS VARCHAR)
            ORDER BY wm.created_at ASC
            LIMIT 1
            """
        ),
        {"email": clean_email},
    ).fetchone()

    # 2. Check if user already owns a workspace in public.users
    user_row = db.execute(
        text(
            """
            SELECT u.id, u.workspace_id, u.full_name, u.role, w.name AS workspace_name, w.slug, w.plan_mode
            FROM users u
            JOIN workspaces w ON w.id = u.workspace_id
            WHERE LOWER(u.email) = CAST(:email AS VARCHAR)
            ORDER BY u.created_at ASC
            LIMIT 1
            """
        ),
        {"email": clean_email},
    ).fetchone()

    # If user was invited to a team workspace, activate invite & attach to that workspace (DO NOT create a free workspace!)
    if member_row and not user_row:
        db.execute(
            text(
                """
                UPDATE workspace_members
                SET status = 'active'
                WHERE workspace_id = CAST(:wid AS UUID)
                  AND LOWER(user_email) = CAST(:email AS VARCHAR)
                """
            ),
            {"wid": str(member_row.workspace_id), "email": clean_email},
        )
        db.commit()
        return {
            "workspace_id": str(member_row.workspace_id),
            "workspace_name": member_row.name,
            "slug": member_row.slug,
            "user_id": payload.supabase_user_id or str(uuid.uuid4()),
            "email": clean_email,
            "full_name": payload.full_name or clean_email.split("@")[0],
            "role": member_row.role or "operator",
            "plan_mode": member_row.plan_mode or "byok",
        }

    if user_row:
        # Also activate any pending invites for this user
        db.execute(
            text(
                """
                UPDATE workspace_members
                SET status = 'active'
                WHERE LOWER(user_email) = CAST(:email AS VARCHAR)
                  AND status = 'invited'
                """
            ),
            {"email": clean_email},
        )
        db.commit()
        return {
            "workspace_id": str(user_row.workspace_id),
            "workspace_name": user_row.workspace_name,
            "slug": user_row.slug,
            "user_id": str(user_row.id),
            "email": clean_email,
            "full_name": user_row.full_name or payload.full_name or clean_email.split("@")[0],
            "role": "owner",
            "plan_mode": user_row.plan_mode or "byok",
        }

    # 3. Brand-new organic user (no invite, no existing workspace) -> create workspace in BYOK mode
    new_ws_id = str(uuid.uuid4())
    new_user_id = (
        str(uuid.UUID(payload.supabase_user_id))
        if payload.supabase_user_id
        else str(uuid.uuid4())
    )
    display_name = (payload.full_name or clean_email.split("@")[0]).strip()
    ws_name = (payload.workspace_name or f"{display_name}'s Workspace").strip()
    ws_slug = _make_unique_slug(db, payload.slug or ws_name)

    db.execute(
        text(
            """
            INSERT INTO workspaces (id, name, slug, is_active, plan_mode, managed_approved)
            VALUES (CAST(:wid AS UUID), :wname, :wslug, TRUE, 'byok', FALSE)
            """
        ),
        {"wid": new_ws_id, "wname": ws_name, "wslug": ws_slug},
    )

    db.execute(
        text(
            """
            INSERT INTO users (id, workspace_id, email, hashed_password, full_name, role)
            VALUES (CAST(:uid AS UUID), CAST(:wid AS UUID), CAST(:email AS VARCHAR), 'SUPABASE_AUTH_MANAGED', :fname, 'owner')
            """
        ),
        {
            "uid": new_user_id,
            "wid": new_ws_id,
            "email": clean_email,
            "fname": display_name,
        },
    )
    db.commit()

    return {
        "workspace_id": new_ws_id,
        "workspace_name": ws_name,
        "slug": ws_slug,
        "user_id": new_user_id,
        "email": clean_email,
        "full_name": display_name,
        "role": "owner",
        "plan_mode": "byok",
    }


@router.get("/my-workspaces")
def get_my_workspaces(email: str, db: Session = Depends(get_db)):
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return {"workspaces": []}

    _ensure_tables_and_columns(db)
    db.commit()

    # Workspaces owned by user
    owned_rows = db.execute(
        text(
            """
            SELECT DISTINCT w.id, w.name, w.slug, w.is_active,
                   LOWER(COALESCE(w.plan_mode, 'byok')) AS plan_mode,
                   COALESCE(w.managed_approved, FALSE) AS managed_approved
            FROM workspaces w
            JOIN users u ON u.workspace_id = w.id
            WHERE LOWER(u.email) = CAST(:email AS VARCHAR)
            """
        ),
        {"email": clean_email},
    ).fetchall()

    seen_ids = set()
    result = []

    for r in owned_rows:
        wid = str(r.id)
        seen_ids.add(wid)
        result.append(
            {
                "id": wid,
                "workspace_id": wid,
                "name": r.name,
                "slug": r.slug,
                "is_active": r.is_active,
                "plan_mode": r.plan_mode,
                "managed_approved": bool(r.managed_approved),
                "role": "owner",
            }
        )

    # Workspaces where user is an invited/active team member
    member_rows = db.execute(
        text(
            """
            SELECT w.id, w.name, w.slug, w.is_active,
                   LOWER(COALESCE(w.plan_mode, 'byok')) AS plan_mode,
                   COALESCE(w.managed_approved, FALSE) AS managed_approved,
                   LOWER(COALESCE(wm.role, 'operator')) AS role
            FROM workspace_members wm
            JOIN workspaces w ON w.id = wm.workspace_id
            WHERE LOWER(wm.user_email) = CAST(:email AS VARCHAR)
            """
        ),
        {"email": clean_email},
    ).fetchall()

    for r in member_rows:
        wid = str(r.id)
        if wid in seen_ids:
            continue
        seen_ids.add(wid)
        result.append(
            {
                "id": wid,
                "workspace_id": wid,
                "name": r.name,
                "slug": r.slug,
                "is_active": r.is_active,
                "plan_mode": r.plan_mode,
                "managed_approved": bool(r.managed_approved),
                "role": r.role,
            }
        )

    return {"workspaces": result}