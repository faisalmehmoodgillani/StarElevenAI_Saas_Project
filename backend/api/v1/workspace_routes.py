import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, Workspace
from backend.schemas.workspace_schema import (
    WorkspaceCreateRequest,
    WorkspaceCreateResponse,
    WorkspaceListResponse,
    WorkspaceSummaryItem,
    WorkspaceUpdateRequest,
)
from backend.services.tenant_service import _hash_password, list_workspaces

router = APIRouter(prefix="/workspaces", tags=["Workspaces & Tenants"])


@router.post("", response_model=WorkspaceCreateResponse)
def register_workspace(payload: WorkspaceCreateRequest, db: Session = Depends(get_db)):
    """Creates a new tenant workspace for an authenticated or new operator."""
    clean_slug = payload.slug.strip().lower()
    existing_slug = db.query(Workspace).filter(Workspace.slug == clean_slug).first()
    if existing_slug:
        raise HTTPException(
            status_code=400,
            detail=f"Workspace slug '{clean_slug}' is already taken.",
        )

    try:
        workspace = Workspace(
            name=payload.name.strip(),
            slug=clean_slug,
            is_active=True,
        )
        db.add(workspace)
        db.flush()

        existing_user = (
            db.query(User).filter(User.email == payload.owner_email).first()
        )

        if not existing_user:
            hashed_pw = (
                _hash_password(payload.admin_password)
                if payload.admin_password
                else "SUPABASE_AUTH_MANAGED"
            )
            user_kwargs = {
                "workspace_id": workspace.id,
                "email": payload.owner_email,
                "full_name": payload.admin_full_name or payload.name.strip(),
                "role": "admin",
            }
            if hasattr(User, "hashed_password"):
                user_kwargs["hashed_password"] = hashed_pw

            admin_user = User(**user_kwargs)
            db.add(admin_user)
            db.flush()
            resolved_user_id = str(admin_user.id)
        else:
            resolved_user_id = str(existing_user.id)

        # Link workspace membership if workspace_members table exists
        inspector = inspect(db.bind)
        if inspector.has_table("workspace_members"):
            cols = {c["name"] for c in inspector.get_columns("workspace_members")}
            if {"workspace_id", "user_id"}.issubset(cols):
                db.execute(
                    text(
                        "INSERT INTO workspace_members (workspace_id, user_id, role) "
                        "VALUES (:wid, :uid, 'admin') ON CONFLICT DO NOTHING"
                    ),
                    {"wid": str(workspace.id), "uid": resolved_user_id},
                )
            elif {"workspace_id", "user_email"}.issubset(cols):
                db.execute(
                    text(
                        "INSERT INTO workspace_members (workspace_id, user_email, role) "
                        "VALUES (:wid, :email, 'admin') ON CONFLICT DO NOTHING"
                    ),
                    {"wid": str(workspace.id), "email": payload.owner_email},
                )

        db.commit()
        db.refresh(workspace)

        return WorkspaceCreateResponse(
            id=str(workspace.id),
            workspace_id=str(workspace.id),
            name=workspace.name,
            workspace_name=workspace.name,
            slug=workspace.slug,
            admin_user_id=resolved_user_id,
            admin_email=payload.owner_email,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workspace: {str(e)}",
        )


@router.patch("/{workspace_id}", response_model=WorkspaceSummaryItem)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdateRequest,
    db: Session = Depends(get_db),
):
    """Updates an existing workspace name, slug, or plan mode."""
    try:
        wid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID.")

    workspace = db.query(Workspace).filter(Workspace.id == wid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if payload.slug and payload.slug.strip().lower() != workspace.slug:
        new_slug = payload.slug.strip().lower()
        slug_taken = (
            db.query(Workspace)
            .filter(Workspace.slug == new_slug, Workspace.id != wid)
            .first()
        )
        if slug_taken:
            raise HTTPException(
                status_code=400,
                detail=f"Workspace slug '{new_slug}' is already taken.",
            )
        workspace.slug = new_slug

    if payload.name:
        workspace.name = payload.name.strip()

    if payload.plan_mode and hasattr(workspace, "plan_mode"):
        workspace.plan_mode = payload.plan_mode.strip().lower()

    db.commit()
    db.refresh(workspace)

    return WorkspaceSummaryItem(
        id=str(workspace.id),
        workspace_id=str(workspace.id),
        name=workspace.name,
        slug=workspace.slug,
        is_active=workspace.is_active,
    )


@router.get("", response_model=WorkspaceListResponse)
def get_all_workspaces(db: Session = Depends(get_db)):
    """Lists all registered workspaces from Supabase."""
    raw_list = list_workspaces(db)
    items = [
        WorkspaceSummaryItem(
            id=w["workspace_id"],
            workspace_id=w["workspace_id"],
            name=w["name"],
            slug=w["slug"],
            is_active=w["is_active"],
        )
        for w in raw_list
    ]
    return WorkspaceListResponse(workspaces=items)