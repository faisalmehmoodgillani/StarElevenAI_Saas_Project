from typing import Optional
from pydantic import BaseModel, Field


class WorkspaceCreateRequest(BaseModel):
    workspace_name: str = Field(..., min_length=2, description="Business or agency workspace name")
    slug: str = Field(..., min_length=2, description="Unique URL-safe workspace identifier")
    admin_email: str = Field(..., description="Primary workspace administrator email")
    admin_password: str = Field(..., min_length=6, description="Primary administrator password")
    admin_full_name: Optional[str] = Field(default=None, description="Administrator full name")


class WorkspaceCreateResponse(BaseModel):
    workspace_id: str
    workspace_name: str
    slug: str
    admin_user_id: str
    admin_email: str


class WorkspaceSummaryItem(BaseModel):
    workspace_id: str
    name: str
    slug: str
    is_active: bool


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceSummaryItem]