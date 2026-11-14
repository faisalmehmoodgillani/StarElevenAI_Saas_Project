from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


class WorkspaceCreateRequest(BaseModel):
    name: Optional[str] = Field(
        default=None, min_length=2, description="Business or agency workspace name"
    )
    workspace_name: Optional[str] = Field(
        default=None, min_length=2, description="Alias for workspace name"
    )
    slug: str = Field(
        ..., min_length=2, description="Unique URL-safe workspace identifier"
    )
    owner_email: Optional[str] = Field(
        default=None, description="Authenticated operator email"
    )
    admin_email: Optional[str] = Field(
        default=None, description="Alias for owner email"
    )
    supabase_user_id: Optional[str] = Field(
        default=None, description="Supabase Auth user UUID"
    )
    admin_password: Optional[str] = Field(
        default=None, description="Optional password for non-Supabase creation"
    )
    admin_full_name: Optional[str] = Field(
        default=None, description="Administrator full name"
    )
    plan_mode: Optional[str] = Field(
        default="byok", description="Default execution mode: byok or managed"
    )

    @model_validator(mode="after")
    def resolve_field_aliases(self):
        if not self.name and self.workspace_name:
            self.name = self.workspace_name
        if not self.owner_email and self.admin_email:
            self.owner_email = self.admin_email
        if not self.name:
            raise ValueError("Workspace name is required.")
        if not self.owner_email:
            raise ValueError("Owner email is required.")
        return self


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)
    slug: Optional[str] = Field(default=None, min_length=2)
    plan_mode: Optional[str] = Field(default=None)
    managed_request_status: Optional[str] = Field(default=None)
    industry: Optional[str] = Field(default=None)
    industry_config: Optional[Dict[str, Any]] = Field(default=None)


class WorkspaceCreateResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    workspace_name: str
    slug: str
    plan_mode: str = "byok"
    managed_approved: bool = False
    managed_request_status: str = "none"
    admin_user_id: Optional[str] = None
    admin_email: str


class WorkspaceSummaryItem(BaseModel):
    id: str
    workspace_id: str
    name: str
    slug: str
    is_active: bool
    plan_mode: str = "byok"
    managed_approved: bool = False
    managed_request_status: str = "none"
    industry: Optional[str] = "general_b2b"
    industry_config: Optional[Dict[str, Any]] = None


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceSummaryItem]