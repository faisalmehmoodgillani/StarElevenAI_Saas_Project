import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, Workspace

router = APIRouter(prefix="/auth", tags=["Authentication & Tenant Sync"])


class SyncWorkspaceRequest(BaseModel):
    supabase_user_id: Optional[str] = None
    email: str
    full_name: Optional[str] = None


def ensure_workspace_members_table(db: Session) -> None:
    """Creates and aligns the multi-workspace junction table in Supabase."""
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_email VARCHAR(255) NOT NULL,
                user_id UUID NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'admin',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )
    )
    db.execute(
        text(
            """
            ALTER TABLE workspace_members
            ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
            """
        )
    )
    db.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_members_ws_email
            ON workspace_members (workspace_id, user_email)
            WHERE user_email IS NOT NULL;
            """
        )
    )
    db.commit()


def _generate_unique_slug(db: Session, base_text: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", base_text.lower()).strip("-") or "workspace"
    slug = clean
    counter = 1
    while db.query(Workspace).filter(Workspace.slug == slug).first():
        slug = f"{clean}-{counter}"
        counter += 1
    return slug


@router.post("/sync-workspace")
def sync_user_workspace(payload: SyncWorkspaceRequest, db: Session = Depends(get_db)):
    """Ensures an authenticated Supabase user has a primary tenant workspace."""
    clean_email = payload.email.strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Email is required.")

    ensure_workspace_members_table(db)

    existing_user = (
        db.query(User).filter(func.lower(User.email) == clean_email).first()
    )

    if existing_user:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == existing_user.workspace_id)
            .first()
        )
        if workspace:
            db.execute(
                text(
                    """
                    INSERT INTO workspace_members (workspace_id, user_email, user_id, role)
                    VALUES (
                        CAST(:wid AS UUID),
                        CAST(:email AS VARCHAR),
                        CAST(:uid AS UUID),
                        CAST(:role AS VARCHAR)
                    )
                    ON CONFLICT (workspace_id, user_email) WHERE user_email IS NOT NULL
                    DO NOTHING
                    """
                ),
                {
                    "wid": str(workspace.id),
                    "email": clean_email,
                    "uid": str(existing_user.id),
                    "role": existing_user.role or "admin",
                },
            )
            db.commit()
            return {
                "workspace": {
                    "id": str(workspace.id),
                    "workspace_id": str(workspace.id),
                    "name": workspace.name,
                    "slug": workspace.slug,
                    "role": existing_user.role or "admin",
                }
            }

    display_name = (
        payload.full_name.strip()
        if payload.full_name and payload.full_name.strip()
        else clean_email.split("@")[0]
    )
    ws_name = f"{display_name}'s Workspace"
    ws_slug = _generate_unique_slug(db, display_name)

    workspace = Workspace(name=ws_name, slug=ws_slug, is_active=True)
    db.add(workspace)
    db.flush()

    new_user = User(
        workspace_id=workspace.id,
        email=clean_email,
        hashed_password="SUPABASE_AUTH_MANAGED",
        full_name=display_name,
        role="admin",
    )
    db.add(new_user)
    db.flush()

    db.execute(
        text(
            """
            INSERT INTO workspace_members (workspace_id, user_email, user_id, role)
            VALUES (
                CAST(:wid AS UUID),
                CAST(:email AS VARCHAR),
                CAST(:uid AS UUID),
                'admin'
            )
            ON CONFLICT (workspace_id, user_email) WHERE user_email IS NOT NULL
            DO NOTHING
            """
        ),
        {
            "wid": str(workspace.id),
            "email": clean_email,
            "uid": str(new_user.id),
        },
    )
    db.commit()
    db.refresh(workspace)

    return {
        "workspace": {
            "id": str(workspace.id),
            "workspace_id": str(workspace.id),
            "name": workspace.name,
            "slug": workspace.slug,
            "role": "admin",
        }
    }


@router.get("/my-workspaces")
def get_my_workspaces(
    email: str = Query(..., description="Authenticated user email"),
    db: Session = Depends(get_db),
):
    """Returns all tenant workspaces belonging to the authenticated user."""
    clean_email = email.strip().lower()
    if not clean_email:
        return {"workspaces": []}

    ensure_workspace_members_table(db)

    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if user:
        # 1. Link primary workspace from users table
        if user.workspace_id:
            db.execute(
                text(
                    """
                    INSERT INTO workspace_members (workspace_id, user_email, user_id, role)
                    VALUES (
                        CAST(:wid AS UUID),
                        CAST(:email AS VARCHAR),
                        CAST(:uid AS UUID),
                        CAST(:role AS VARCHAR)
                    )
                    ON CONFLICT (workspace_id, user_email) WHERE user_email IS NOT NULL
                    DO NOTHING
                    """
                ),
                {
                    "wid": str(user.workspace_id),
                    "email": clean_email,
                    "uid": str(user.id),
                    "role": user.role or "admin",
                },
            )

        # 2. Recover & link any unclaimed workspaces created by this operator
        db.execute(
            text(
                """
                INSERT INTO workspace_members (workspace_id, user_email, user_id, role)
                SELECT w.id, CAST(:email AS VARCHAR), CAST(:uid AS UUID), 'admin'
                FROM workspaces w
                WHERE w.is_active = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM users u
                      WHERE u.workspace_id = w.id
                        AND LOWER(u.email) <> LOWER(CAST(:email AS TEXT))
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM workspace_members wm
                      WHERE wm.workspace_id = w.id
                        AND wm.user_email IS NOT NULL
                        AND LOWER(wm.user_email) <> LOWER(CAST(:email AS TEXT))
                  )
                ON CONFLICT (workspace_id, user_email) WHERE user_email IS NOT NULL
                DO NOTHING
                """
            ),
            {
                "email": clean_email,
                "uid": str(user.id),
            },
        )
        db.commit()

    rows = db.execute(
        text(
            """
            SELECT w.id, w.name, w.slug, w.is_active, COALESCE(wm.role, 'admin') AS role
            FROM workspaces w
            INNER JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE LOWER(wm.user_email) = LOWER(CAST(:email AS TEXT))
              AND w.is_active = TRUE
            ORDER BY w.created_at ASC
            """
        ),
        {"email": clean_email},
    ).fetchall()

    workspaces = [
        {
            "id": str(row.id),
            "workspace_id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "role": row.role,
            "is_active": row.is_active,
        }
        for row in rows
    ]

    return {"workspaces": workspaces}