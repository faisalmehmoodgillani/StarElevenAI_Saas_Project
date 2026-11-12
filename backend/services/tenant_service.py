import hashlib
import os
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.models import Workspace, User, AgentConfig
from backend.services.security import encrypt_api_key


def _hash_password(plain_password: str) -> str:
    """Hashes user password using PBKDF2-HMAC-SHA256 with random salt."""
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${dk}"


def create_workspace_with_admin(
    db: Session,
    workspace_name: str,
    slug: str,
    admin_email: str,
    admin_password: str,
    admin_full_name: Optional[str] = None,
) -> dict:
    """Creates a new tenant workspace and its primary admin user in Supabase."""
    existing_slug = db.query(Workspace).filter(Workspace.slug == slug).first()
    if existing_slug:
        raise ValueError(f"Workspace slug '{slug}' is already taken.")

    existing_email = db.query(User).filter(User.email == admin_email).first()
    if existing_email:
        raise ValueError(f"User with email '{admin_email}' already exists.")

    workspace = Workspace(name=workspace_name, slug=slug, is_active=True)
    db.add(workspace)
    db.flush()  # Generates workspace.id before committing

    admin_user = User(
        workspace_id=workspace.id,
        email=admin_email,
        hashed_password=_hash_password(admin_password),
        full_name=admin_full_name or workspace_name,
        role="admin",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(workspace)
    db.refresh(admin_user)

    return {
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "slug": workspace.slug,
        "admin_user_id": str(admin_user.id),
        "admin_email": admin_user.email,
    }


def create_agent_configuration(
    db: Session,
    workspace_id: str,
    agent_type: str,
    provider: str,
    model_name: str,
    plain_api_key: Optional[str] = None,
    settings_json: Optional[dict] = None,
) -> dict:
    """Saves a workspace agent config with AES-256 encrypted API key in Supabase."""
    wid = uuid.UUID(workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == wid).first()
    if not workspace:
        raise ValueError(f"Workspace not found for ID: {workspace_id}")

    encrypted_key = encrypt_api_key(plain_api_key) if plain_api_key else None

    agent_cfg = AgentConfig(
        workspace_id=wid,
        agent_type=agent_type,
        provider=provider,
        model_name=model_name,
        encrypted_api_key=encrypted_key,
        settings_json=settings_json or {},
    )
    db.add(agent_cfg)
    db.commit()
    db.refresh(agent_cfg)

    return {
        "agent_config_id": str(agent_cfg.id),
        "workspace_id": str(agent_cfg.workspace_id),
        "agent_type": agent_cfg.agent_type,
        "provider": agent_cfg.provider,
        "model_name": agent_cfg.model_name,
        "has_custom_encrypted_key": bool(agent_cfg.encrypted_api_key),
    }


def list_workspaces(db: Session) -> list[dict]:
    """Returns all registered workspaces."""
    workspaces = db.query(Workspace).order_by(Workspace.created_at.desc()).all()
    return [
        {
            "workspace_id": str(w.id),
            "name": w.name,
            "slug": w.slug,
            "is_active": w.is_active,
        }
        for w in workspaces
    ]