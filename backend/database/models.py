import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.connection import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    plan_mode = Column(String(50), default="managed")  # managed, byok, byodb

    # Phase 4: Dynamic Industry Customization Layer
    industry = Column(String(100), nullable=False, default="general", index=True)
    industry_config = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="workspace", cascade="all, delete-orphan")
    agent_configs = relationship(
        "AgentConfig", back_populates="workspace", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for Supabase OAuth/OTP users
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="member")  # admin, member, client
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="users")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_email", name="uq_workspace_member_email"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_email = Column(String(255), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    role = Column(String(50), default="admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    agent_type = Column(String(100), nullable=False)  # e.g., 'research_agent', 'crm_agent', 'lead_gen'
    provider = Column(String(50), nullable=False)     # e.g., 'groq', 'google', 'openai', 'anthropic'
    model_name = Column(String(100), nullable=False)
    encrypted_api_key = Column(Text, nullable=True)
    settings_json = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="agent_configs")




# ALTER TABLE workspaces
# ADD COLUMN IF NOT EXISTS plan_mode VARCHAR(50) DEFAULT 'managed',
# ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NOT NULL DEFAULT 'general',
# ADD COLUMN IF NOT EXISTS industry_config JSONB NOT NULL DEFAULT '{}'::jsonb;

# CREATE INDEX IF NOT EXISTS idx_workspaces_industry ON workspaces (industry);