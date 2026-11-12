import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, Workspace

router = APIRouter(prefix="/auth", tags=["Authentication & Tenant Sync"])


class SyncWorkspacePayload(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Workspace Admin"
    workspace_name: Optional[str] = None
    slug: Optional[str] = None
    supabase_user_id: Optional[str] = None


def _generate_unique_slug(db: Session, base_text: str) -> str:
    clean = re.sub(r"[^a-z0-9\s-]", "", base_text.lower().strip())
    clean = re.sub(r"[\s-]+", "-", clean).strip("-") or "workspace"
    candidate = clean
    counter = 1
    while db.query(Workspace).filter(Workspace.slug == candidate).first():
        candidate = f"{clean}-{counter}"
        counter += 1
    return candidate


@router.post("/sync-workspace")
def sync_authenticated_user_workspace(
    payload: SyncWorkspacePayload,
    db: Session = Depends(get_db),
):
    """
    Links a verified Supabase Auth user (Email OTP or Google OAuth)
    with a PostgreSQL tenant workspace. Creates a default workspace if new.
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()

    if existing_user:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == existing_user.workspace_id)
            .first()
        )
        if not workspace:
            raise HTTPException(status_code=404, detail="Linked workspace not found.")

        return {
            "workspace_id": str(workspace.id),
            "workspace_name": workspace.name,
            "slug": workspace.slug,
            "user_id": str(existing_user.id),
            "email": existing_user.email,
            "full_name": existing_user.full_name or payload.full_name,
            "is_new_workspace": False,
        }

    # Provision new tenant workspace for newly verified user
    ws_name = (
        payload.workspace_name.strip()
        if payload.workspace_name and payload.workspace_name.strip()
        else f"{(payload.full_name or payload.email.split('@')[0]).title()} Workspace"
    )
    ws_slug = _generate_unique_slug(db, payload.slug or ws_name)

    new_workspace = Workspace(
        id=uuid.uuid4(),
        name=ws_name,
        slug=ws_slug,
    )
    db.add(new_workspace)
    db.flush()

    user_uuid = uuid.uuid4()
    if payload.supabase_user_id:
        try:
            user_uuid = uuid.UUID(payload.supabase_user_id)
        except ValueError:
            pass

    new_user = User(
        id=user_uuid,
        workspace_id=new_workspace.id,
        email=payload.email,
        full_name=payload.full_name or payload.email.split("@")[0],
        role="admin",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_workspace)
    db.refresh(new_user)

    return {
        "workspace_id": str(new_workspace.id),
        "workspace_name": new_workspace.name,
        "slug": new_workspace.slug,
        "user_id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "is_new_workspace": True,
    }


@router.get("/my-workspaces")
def get_user_scoped_workspaces(email: EmailStr, db: Session = Depends(get_db)):
    """Returns ONLY workspaces belonging to the authenticated user email."""
    user_records = db.query(User).filter(User.email == email).all()
    if not user_records:
        return {"workspaces": []}

    workspace_ids = [u.workspace_id for u in user_records]
    workspaces = (
        db.query(Workspace).filter(Workspace.id.in_(workspace_ids)).all()
    )

    return {
        "workspaces": [
            {
                "workspace_id": str(ws.id),
                "name": ws.name,
                "slug": ws.slug,
            }
            for ws in workspaces
        ]
    }