from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.workspace_schema import (
    WorkspaceCreateRequest,
    WorkspaceCreateResponse,
    WorkspaceListResponse,
)
from backend.services.tenant_service import (
    create_workspace_with_admin,
    list_workspaces,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces & Tenants"])


@router.post("", response_model=WorkspaceCreateResponse)
def register_workspace(payload: WorkspaceCreateRequest, db: Session = Depends(get_db)):
    """Creates a new tenant workspace and primary admin user in Supabase."""
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


@router.get("", response_model=WorkspaceListResponse)
def get_all_workspaces(db: Session = Depends(get_db)):
    """Lists all registered workspaces from Supabase."""
    return WorkspaceListResponse(workspaces=list_workspaces(db))