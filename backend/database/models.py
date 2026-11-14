import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    BigInteger,
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

    # Billing Mode & Per-Workspace Tier Isolation (Module 07)
    plan_mode = Column(String(50), nullable=False, default="byok")  # byok | managed
    plan_tier = Column(
        String(50), nullable=False, default="byok_free", index=True
    )  # byok_free | managed_starter | managed_growth | managed_enterprise
    requested_plan_tier = Column(String(50), nullable=True)
    billing_interval = Column(String(20), nullable=False, default="monthly")  # monthly | annual
    managed_approved = Column(Boolean, nullable=False, default=False)
    managed_request_status = Column(
        String(50), nullable=False, default="none"
    )  # none | pending | approved | rejected
    monthly_token_limit = Column(BigInteger, nullable=False, default=0)
    tokens_used_this_month = Column(BigInteger, nullable=False, default=0)
    billing_cycle_end = Column(DateTime(timezone=True), nullable=True)

    # Industry Vertical & AI Persona Configuration
    industry = Column(String(100), nullable=False, default="agency", index=True)
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
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="owner")
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
    role = Column(String(50), default="operator")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    agent_type = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)
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

# Approval Columns Add
# ALTER TABLE workspaces
# ADD COLUMN IF NOT EXISTS plan_mode VARCHAR(20) DEFAULT 'byok',
# ADD COLUMN IF NOT EXISTS managed_approved BOOLEAN DEFAULT FALSE,
# ADD COLUMN IF NOT EXISTS managed_request_status VARCHAR(20) DEFAULT 'none';

# -- Approve existing workspaces created so far (new signups will default to BYOK + unapproved)
# UPDATE workspaces
# SET managed_approved = TRUE,
#     managed_request_status = 'approved'
# WHERE managed_approved IS FALSE;


# Clean Database Reset
# TRUNCATE TABLE
#   checkpoints,
#   checkpoint_blobs,
#   checkpoint_writes,
#   workspace_members,
#   agent_configs,
#   users,
#   workspaces
# RESTART IDENTITY CASCADE;


# -- Module 07: Per-Workspace Pricing, Billing Quotas & Industry Tagging
# ALTER TABLE workspaces
#   ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NOT NULL DEFAULT 'agency',
#   ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) NOT NULL DEFAULT 'byok_free',
#   ADD COLUMN IF NOT EXISTS requested_plan_tier VARCHAR(50) NULL,
#   ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
#   ADD COLUMN IF NOT EXISTS monthly_token_limit BIGINT NOT NULL DEFAULT 0,
#   ADD COLUMN IF NOT EXISTS tokens_used_this_month BIGINT NOT NULL DEFAULT 0,
#   ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ NULL;

# -- Backfill existing workspaces safely based on current plan_mode & managed_approved
# UPDATE workspaces
# SET
#   plan_tier = CASE
#     WHEN LOWER(COALESCE(plan_mode, 'byok')) = 'managed' AND COALESCE(managed_approved, FALSE) = TRUE
#       THEN 'managed_starter'
#     ELSE 'byok_free'
#   END,
#   monthly_token_limit = CASE
#     WHEN LOWER(COALESCE(plan_mode, 'byok')) = 'managed' AND COALESCE(managed_approved, FALSE) = TRUE
#       THEN 2000000
#     ELSE 0
#   END,
#   billing_cycle_end = CASE
#     WHEN LOWER(COALESCE(plan_mode, 'byok')) = 'managed' AND COALESCE(managed_approved, FALSE) = TRUE
#       THEN COALESCE(billing_cycle_end, NOW() + INTERVAL '30 days')
#     ELSE NULL
#   END
# WHERE plan_tier IS NULL OR plan_tier = '';

# CREATE INDEX IF NOT EXISTS idx_workspaces_industry ON workspaces (industry);
# CREATE INDEX IF NOT EXISTS idx_workspaces_plan_tier ON workspaces (plan_tier);