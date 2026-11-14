import hashlib
import json
import os
import uuid
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.database.models import Workspace, User
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
    """Creates a new tenant workspace (default BYOK) and its primary admin user in Supabase."""
    existing_slug = db.query(Workspace).filter(Workspace.slug == slug).first()
    if existing_slug:
        raise ValueError(f"Workspace slug '{slug}' is already taken.")

    existing_email = db.query(User).filter(User.email == admin_email).first()
    if existing_email:
        raise ValueError(f"User with email '{admin_email}' already exists.")

    workspace = Workspace(name=workspace_name, slug=slug, is_active=True)
    db.add(workspace)
    db.flush()

    admin_user = User(
        workspace_id=workspace.id,
        email=admin_email,
        hashed_password=_hash_password(admin_password),
        full_name=admin_full_name or workspace_name,
        role="owner",
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
    """Schema-safe upsert of workspace agent config & AES-256 encrypted API key."""
    try:
        wid = uuid.UUID(str(workspace_id).strip())
    except ValueError as exc:
        raise ValueError(f"Invalid workspace_id UUID: {workspace_id}") from exc

    ws_exists = db.execute(
        text("SELECT 1 FROM workspaces WHERE id = CAST(:wid AS UUID) LIMIT 1"),
        {"wid": str(wid)},
    ).fetchone()
    if not ws_exists:
        raise ValueError(f"Workspace not found for ID: {workspace_id}")

    encrypted_key = (
        encrypt_api_key(plain_api_key)
        if plain_api_key and plain_api_key.strip()
        else None
    )

    clean_agent_type = (agent_type or "default").strip()
    clean_provider = (provider or "groq").strip().lower()
    clean_model = (model_name or "openai/gpt-oss-20b").strip()
    serialized_settings = json.dumps(settings_json or {})

    # Inspect live columns on agent_configs so NOT NULL extra columns never fail
    col_rows = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agent_configs'
            """
        )
    ).fetchall()
    existing_cols = {r[0] for r in col_rows}

    if "encrypted_api_key" not in existing_cols:
        db.execute(text("ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT NULL"))
        existing_cols.add("encrypted_api_key")

    existing_row = db.execute(
        text(
            """
            SELECT id, encrypted_api_key
            FROM agent_configs
            WHERE workspace_id = CAST(:wid AS UUID)
              AND agent_type = :atype
            LIMIT 1
            """
        ),
        {"wid": str(wid), "atype": clean_agent_type},
    ).fetchone()

    if existing_row:
        final_enc_key = encrypted_key if encrypted_key is not None else existing_row.encrypted_api_key
        set_clauses = [
            "provider = :prov",
            "model_name = :mname",
            "encrypted_api_key = :ekey",
        ]
        params = {
            "cid": str(existing_row.id),
            "prov": clean_provider,
            "mname": clean_model,
            "ekey": final_enc_key,
        }
        if "settings_json" in existing_cols:
            set_clauses.append("settings_json = CAST(:sjson AS JSONB)")
            params["sjson"] = serialized_settings

        db.execute(
            text(f"UPDATE agent_configs SET {', '.join(set_clauses)} WHERE id = CAST(:cid AS UUID)"),
            params,
        )
        db.commit()
        config_id = str(existing_row.id)
        has_key = bool(final_enc_key)
    else:
        new_id = str(uuid.uuid4())
        cols = ["id", "workspace_id", "agent_type", "provider", "model_name", "encrypted_api_key"]
        vals = [
            "CAST(:cid AS UUID)",
            "CAST(:wid AS UUID)",
            ":atype",
            ":prov",
            ":mname",
            ":ekey",
        ]
        params = {
            "cid": new_id,
            "wid": str(wid),
            "atype": clean_agent_type,
            "prov": clean_provider,
            "mname": clean_model,
            "ekey": encrypted_key,
        }
        if "settings_json" in existing_cols:
            cols.append("settings_json")
            vals.append("CAST(:sjson AS JSONB)")
            params["sjson"] = serialized_settings
        if "name" in existing_cols:
            cols.append("name")
            vals.append(":aname")
            params["aname"] = clean_agent_type.replace("_", " ").title()
        if "system_prompt" in existing_cols:
            cols.append("system_prompt")
            vals.append(":sprompt")
            params["sprompt"] = "You are a helpful enterprise AI assistant."
        if "is_active" in existing_cols:
            cols.append("is_active")
            vals.append("TRUE")

        db.execute(
            text(f"INSERT INTO agent_configs ({', '.join(cols)}) VALUES ({', '.join(vals)})"),
            params,
        )
        db.commit()
        config_id = new_id
        has_key = bool(encrypted_key)

    return {
        "agent_config_id": config_id,
        "workspace_id": str(wid),
        "agent_type": clean_agent_type,
        "provider": clean_provider,
        "model_name": clean_model,
        "has_custom_encrypted_key": has_key,
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