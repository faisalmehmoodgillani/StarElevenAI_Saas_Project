import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Workspace, WorkspaceAgent, WorkspaceIntegration
from backend.mcp.client_manager import discover_mcp_server_tools
from backend.services.integration_vault import list_workspace_connectors
from backend.skills.industry_skills import (
    INDUSTRY_SKILL_TEMPLATES,
    build_industry_enriched_prompt,
    get_skill_template_by_id,
)

router = APIRouter(prefix="/agents-studio", tags=["Agent Studio & Industry Skills"])


class CreateCustomAgentRequest(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=2, max_length=120)
    role_title: str = Field(default="Specialist Agent", max_length=120)
    system_prompt: str = Field(..., min_length=10)
    bound_tools: List[str] = Field(default_factory=list)
    hitl_enabled: bool = True


class DeploySkillRequest(BaseModel):
    workspace_id: str
    skill_id: str
    custom_name: Optional[str] = None


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    role_title: Optional[str] = None
    system_prompt: Optional[str] = None
    bound_tools: Optional[List[str]] = None
    hitl_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


def _slugify(value: str) -> str:
    clean = "".join(ch if ch.isalnum() else "-" for ch in value.lower()).strip("-")
    while "--" in clean:
        clean = clean.replace("--", "-")
    return clean or "agent"


def _validate_bound_tools(db: Session, workspace_id: str, bound_tools: List[str]) -> List[str]:
    """Ensures zero tool mismatch: every bound connector must exist and be connected."""
    connectors = list_workspace_connectors(db, workspace_id)
    connected_ids = {c["connector_id"] for c in connectors if c.get("is_connected")}
    valid_ids = {c["connector_id"] for c in connectors}

    cleaned: List[str] = []
    for cid in bound_tools:
        c = (cid or "").strip()
        if not c:
            continue
        if c not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Unknown tool connector: '{c}'.")
        if c not in connected_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Connector '{c}' is not connected yet. Please connect it before binding to an agent.",
            )
        if c not in cleaned:
            cleaned.append(c)
    return cleaned


def _serialize_agent(agent: WorkspaceAgent) -> dict:
    return {
        "id": str(agent.id),
        "workspace_id": str(agent.workspace_id),
        "name": agent.name,
        "slug": agent.slug,
        "role_title": agent.role_title,
        "industry": agent.industry,
        "skill_template_id": agent.skill_template_id,
        "system_prompt": agent.system_prompt,
        "bound_tools": agent.bound_tools or [],
        "hitl_enabled": bool(agent.hitl_enabled),
        "is_active": bool(agent.is_active),
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
    }


@router.get("/skills/{workspace_id}")
def get_industry_skills(workspace_id: str, db: Session = Depends(get_db)):
    """
    Returns Industry Skill Templates annotated with per-workspace connector readiness
    (which required tools are already connected vs missing).
    """
    wid = uuid.UUID(str(workspace_id))
    ws = db.query(Workspace).filter(Workspace.id == wid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    connectors = list_workspace_connectors(db, workspace_id)
    connected_ids = {c["connector_id"] for c in connectors if c.get("is_connected")}

    enriched_skills = []
    for skill in INDUSTRY_SKILL_TEMPLATES:
        req = skill["required_connectors"]
        missing = [cid for cid in req if cid not in connected_ids]
        enriched_skills.append(
            {
                **skill,
                "is_recommended_for_workspace": skill["industry"] == (ws.industry or "agency"),
                "ready_to_deploy": len(missing) == 0,
                "missing_connectors": missing,
            }
        )

    # Sort workspace's own industry skills first
    enriched_skills.sort(key=lambda s: (not s["is_recommended_for_workspace"], s["name"]))
    return {
        "workspace_id": workspace_id,
        "workspace_industry": ws.industry,
        "skills": enriched_skills,
    }


@router.post("/deploy-skill")
def deploy_industry_skill_agent(payload: DeploySkillRequest, db: Session = Depends(get_db)):
    """1-Click deploys an Industry Skill Template as a live workspace agent."""
    wid = uuid.UUID(str(payload.workspace_id))
    ws = db.query(Workspace).filter(Workspace.id == wid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    skill = get_skill_template_by_id(payload.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Industry Skill template not found.")

    validated_tools = _validate_bound_tools(db, payload.workspace_id, skill["required_connectors"])

    agent_name = (payload.custom_name or skill["name"]).strip()
    base_slug = _slugify(agent_name)
    candidate_slug = base_slug
    counter = 1
    while (
        db.query(WorkspaceAgent)
        .filter(WorkspaceAgent.workspace_id == wid, WorkspaceAgent.slug == candidate_slug)
        .first()
    ):
        counter += 1
        candidate_slug = f"{base_slug}-{counter}"

    enriched_prompt = build_industry_enriched_prompt(
        base_prompt=skill["system_prompt"],
        workspace_name=ws.name,
        industry=ws.industry or skill["industry"],
        industry_config=ws.industry_config,
    )

    new_agent = WorkspaceAgent(
        workspace_id=wid,
        name=agent_name,
        slug=candidate_slug,
        role_title=skill["role_title"],
        industry=ws.industry or skill["industry"],
        skill_template_id=skill["skill_id"],
        system_prompt=enriched_prompt,
        bound_tools=validated_tools,
        hitl_enabled=bool(skill.get("hitl_enabled", True)),
        is_active=True,
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return {"status": "deployed", "agent": _serialize_agent(new_agent)}


@router.get("/{workspace_id}")
def list_workspace_agents(workspace_id: str, db: Session = Depends(get_db)):
    """Returns all user-created/deployed agents in this workspace (starts empty on signup)."""
    wid = uuid.UUID(str(workspace_id))
    rows = (
        db.query(WorkspaceAgent)
        .filter(WorkspaceAgent.workspace_id == wid)
        .order_by(WorkspaceAgent.created_at.desc())
        .all()
    )
    return {"workspace_id": workspace_id, "agents": [_serialize_agent(r) for r in rows]}


@router.post("/create")
def create_custom_agent(payload: CreateCustomAgentRequest, db: Session = Depends(get_db)):
    """Creates a custom agent with verified, connected tools only."""
    wid = uuid.UUID(str(payload.workspace_id))
    ws = db.query(Workspace).filter(Workspace.id == wid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    validated_tools = _validate_bound_tools(db, payload.workspace_id, payload.bound_tools)

    base_slug = _slugify(payload.name)
    candidate_slug = base_slug
    counter = 1
    while (
        db.query(WorkspaceAgent)
        .filter(WorkspaceAgent.workspace_id == wid, WorkspaceAgent.slug == candidate_slug)
        .first()
    ):
        counter += 1
        candidate_slug = f"{base_slug}-{counter}"

    enriched_prompt = build_industry_enriched_prompt(
        base_prompt=payload.system_prompt,
        workspace_name=ws.name,
        industry=ws.industry or "agency",
        industry_config=ws.industry_config,
    )

    new_agent = WorkspaceAgent(
        workspace_id=wid,
        name=payload.name.strip(),
        slug=candidate_slug,
        role_title=payload.role_title.strip() or "Specialist Agent",
        industry=ws.industry or "agency",
        skill_template_id=None,
        system_prompt=enriched_prompt,
        bound_tools=validated_tools,
        hitl_enabled=payload.hitl_enabled,
        is_active=True,
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return {"status": "created", "agent": _serialize_agent(new_agent)}


@router.patch("/{workspace_id}/{agent_id}")
def update_workspace_agent(
    workspace_id: str,
    agent_id: str,
    payload: UpdateAgentRequest,
    db: Session = Depends(get_db),
):
    wid = uuid.UUID(str(workspace_id))
    aid = uuid.UUID(str(agent_id))
    agent = (
        db.query(WorkspaceAgent)
        .filter(WorkspaceAgent.workspace_id == wid, WorkspaceAgent.id == aid)
        .first()
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")

    if payload.name is not None and payload.name.strip():
        agent.name = payload.name.strip()
    if payload.role_title is not None:
        agent.role_title = payload.role_title.strip()
    if payload.system_prompt is not None and payload.system_prompt.strip():
        agent.system_prompt = payload.system_prompt.strip()
    if payload.bound_tools is not None:
        agent.bound_tools = _validate_bound_tools(db, workspace_id, payload.bound_tools)
    if payload.hitl_enabled is not None:
        agent.hitl_enabled = payload.hitl_enabled
    if payload.is_active is not None:
        agent.is_active = payload.is_active

    db.commit()
    db.refresh(agent)
    return {"status": "updated", "agent": _serialize_agent(agent)}


@router.delete("/{workspace_id}/{agent_id}")
def delete_workspace_agent(workspace_id: str, agent_id: str, db: Session = Depends(get_db)):
    wid = uuid.UUID(str(workspace_id))
    aid = uuid.UUID(str(agent_id))
    agent = (
        db.query(WorkspaceAgent)
        .filter(WorkspaceAgent.workspace_id == wid, WorkspaceAgent.id == aid)
        .first()
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")
    db.delete(agent)
    db.commit()
    return {"status": "deleted", "agent_id": agent_id}


@router.post("/discover-mcp/{workspace_id}/{connector_id}")
def refresh_mcp_discovered_tools(
    workspace_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
):
    """Probes a connected Remote MCP Server and updates its cached tool list in Supabase."""
    wid = uuid.UUID(str(workspace_id))
    record = (
        db.query(WorkspaceIntegration)
        .filter(
            WorkspaceIntegration.workspace_id == wid,
            WorkspaceIntegration.connector_id == connector_id,
        )
        .first()
    )
    if not record or not record.mcp_url:
        raise HTTPException(status_code=404, detail="Remote MCP connector not found.")

    bearer = None
    if record.encrypted_credentials:
        import json
        from backend.services.security import decrypt_api_key

        try:
            creds = json.loads(decrypt_api_key(record.encrypted_credentials))
            bearer = creds.get("bearer_token") or creds.get("api_key")
        except Exception:
            pass

    probe = discover_mcp_server_tools(record.mcp_url, bearer_token=bearer)
    record.cached_tools = probe.get("tools", ["dynamic_mcp_tools"])
    db.commit()
    return {
        "connector_id": connector_id,
        "mcp_url": record.mcp_url,
        "discovered": probe,
    }