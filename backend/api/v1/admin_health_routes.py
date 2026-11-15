import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import AgentConfig, SystemErrorLog, User, Workspace, WorkspaceMember
from backend.middleware.error_logger import classify_and_log_error
from backend.services.security import decrypt_api_key

router = APIRouter(prefix="/admin/health", tags=["Super Admin Observability"])


def _verify_super_admin(x_admin_email: Optional[str]) -> str:
    configured = os.getenv("SUPER_ADMIN_EMAILS", "") or os.getenv("NEXT_PUBLIC_SUPER_ADMIN_EMAIL", "")
    allowed = [e.strip().lower() for e in configured.split(",") if e.strip()]
    email = (x_admin_email or "").strip().lower()
    if not email or (allowed and email not in allowed):
        raise HTTPException(status_code=403, detail="Super Admin privileges required.")
    return email


def _probe_database_latency(db: Session) -> Dict[str, Any]:
    start = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        return {"ok": True, "latency_ms": latency_ms, "status": "Operational"}
    except Exception as exc:
        classify_and_log_error(exc)
        return {"ok": False, "latency_ms": None, "status": f"Outage: {str(exc)[:120]}"}


@router.get("/overview")
def get_platform_health_overview(
    x_admin_email: Optional[str] = Header(default=None, alias="X-Admin-Email"),
    db: Session = Depends(get_db),
):
    """
    Returns platform observability KPIs, workspace health matrix, and
    classified error logs separating Client Config Faults vs. Platform Outages.
    """
    _verify_super_admin(x_admin_email)

    db_probe = _probe_database_latency(db)
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    workspaces: List[Workspace] = db.query(Workspace).order_by(Workspace.created_at.desc()).all()

    # Map primary owner email for each workspace
    owner_map: Dict[str, str] = {}
    members = db.query(WorkspaceMember).all()
    for m in members:
        wid_str = str(m.workspace_id)
        if wid_str not in owner_map or (m.role or "").lower() == "owner":
            owner_map[wid_str] = m.user_email

    users = db.query(User).all()
    for u in users:
        wid_str = str(u.workspace_id)
        if wid_str not in owner_map:
            owner_map[wid_str] = u.email

    # Count configured agents & BYOK keys per workspace
    agent_configs = db.query(AgentConfig).all()
    agents_by_ws: Dict[str, List[AgentConfig]] = {}
    for cfg in agent_configs:
        agents_by_ws.setdefault(str(cfg.workspace_id), []).append(cfg)

    # Fetch recent error logs (last 100)
    recent_logs: List[SystemErrorLog] = (
        db.query(SystemErrorLog)
        .order_by(desc(SystemErrorLog.created_at))
        .limit(100)
        .all()
    )

    logs_by_ws_24h: Dict[str, List[SystemErrorLog]] = {}
    for log in recent_logs:
        if log.workspace_id and log.created_at:
            created = log.created_at if log.created_at.tzinfo else log.created_at.replace(tzinfo=timezone.utc)
            if created >= cutoff_24h:
                logs_by_ws_24h.setdefault(str(log.workspace_id), []).append(log)

    workspace_matrix: List[Dict[str, Any]] = []
    healthy_count = 0
    client_warning_count = 0
    failed_workspaces_count = 0

    for ws in workspaces:
        wid = str(ws.id)
        ws_logs = logs_by_ws_24h.get(wid, [])
        ws_agents = agents_by_ws.get(wid, [])
        plan_mode = (ws.plan_mode or "byok").lower()
        has_byok_key = any(bool(a.encrypted_api_key) for a in ws_agents)

        platform_faults = [l for l in ws_logs if not l.is_client_fault]
        client_faults = [l for l in ws_logs if l.is_client_fault]

        if not ws.is_active or platform_faults:
            health_status = "execution_failed"
            status_label = "Execution Failed"
            fault_attribution = (
                "Workspace Suspended"
                if not ws.is_active
                else "Platform Infrastructure Error"
            )
            latest_err = platform_faults[0] if platform_faults else None
            failed_workspaces_count += 1
        elif client_faults or (plan_mode == "byok" and not has_byok_key):
            health_status = "client_warning"
            status_label = "Client Key Warning"
            fault_attribution = "User Config Issue — Platform Operational"
            latest_err = client_faults[0] if client_faults else None
            client_warning_count += 1
        else:
            health_status = "healthy"
            status_label = "Healthy"
            fault_attribution = "All Systems Operational"
            latest_err = None
            healthy_count += 1

        workspace_matrix.append(
            {
                "workspace_id": wid,
                "workspace_name": ws.name,
                "slug": ws.slug,
                "owner_email": owner_map.get(wid, "unassigned@workspace"),
                "plan_mode": plan_mode,
                "is_active": bool(ws.is_active),
                "health_status": health_status,
                "status_label": status_label,
                "fault_attribution": fault_attribution,
                "configured_agents_count": len(ws_agents),
                "has_byok_key": has_byok_key,
                "error_count_24h": len(ws_logs),
                "latest_error_code": (
                    latest_err.error_code
                    if latest_err
                    else ("MISSING_BYOK_KEY" if health_status == "client_warning" else None)
                ),
                "latest_error_message": (
                    latest_err.error_message
                    if latest_err
                    else (
                        "BYOK workspace has no API key saved in Plan & AI Vault."
                        if health_status == "client_warning"
                        else "No execution faults detected in the last 24 hours."
                    )
                ),
                "latest_error_at": latest_err.created_at.isoformat() if latest_err and latest_err.created_at else None,
            }
        )

    platform_outages_24h = sum(
        1
        for l in recent_logs
        if (not l.is_client_fault)
        and l.created_at
        and (l.created_at if l.created_at.tzinfo else l.created_at.replace(tzinfo=timezone.utc)) >= cutoff_24h
    )
    if not db_probe["ok"]:
        platform_outages_24h += 1

    ws_name_lookup = {str(w.id): w.name for w in workspaces}
    serialized_logs = [
        {
            "id": str(l.id),
            "workspace_id": str(l.workspace_id) if l.workspace_id else None,
            "workspace_name": ws_name_lookup.get(str(l.workspace_id), "Global Platform")
            if l.workspace_id
            else "Global Platform",
            "error_code": l.error_code,
            "error_message": l.error_message,
            "is_client_fault": bool(l.is_client_fault),
            "severity": l.severity,
            "fault_attribution": (
                "User Config Issue — Platform Operational"
                if l.is_client_fault
                else "Platform Infrastructure Error"
            ),
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in recent_logs
    ]

    return {
        "infrastructure": {
            "database": db_probe,
            "platform_operational": db_probe["ok"] and platform_outages_24h == 0,
        },
        "kpis": {
            "total_workspaces": len(workspaces),
            "healthy_workspaces": healthy_count,
            "client_key_warning_count": client_warning_count,
            "active_outages": platform_outages_24h,
            "failed_workspaces": failed_workspaces_count,
        },
        "workspaces": workspace_matrix,
        "logs": serialized_logs,
    }


@router.post("/test-workspace/{workspace_id}")
def run_workspace_health_diagnostic(
    workspace_id: str,
    x_admin_email: Optional[str] = Header(default=None, alias="X-Admin-Email"),
    db: Session = Depends(get_db),
):
    """
    Executes an on-demand diagnostic check on a specific workspace (DB state,
    Vault key decryption, provider readiness, and recent error attribution).
    """
    _verify_super_admin(x_admin_email)

    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID format.")

    ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    start = time.perf_counter()
    checks: List[Dict[str, Any]] = []

    # Check 1: Workspace active status
    checks.append(
        {
            "name": "Tenant State & Isolation",
            "passed": bool(ws.is_active),
            "detail": "Workspace is active and isolated." if ws.is_active else "Workspace is currently suspended.",
        }
    )

    # Check 2: LLM Credential / Vault Verification
    plan_mode = (ws.plan_mode or "byok").lower()
    configs = db.query(AgentConfig).filter(AgentConfig.workspace_id == ws_uuid).all()
    key_configs = [c for c in configs if c.encrypted_api_key]

    if plan_mode == "managed":
        has_master = bool(
            os.getenv("GROQ_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )
        checks.append(
            {
                "name": "Managed Cloud Master Key",
                "passed": has_master,
                "detail": (
                    "StarEleven Managed LLM keys are loaded and ready."
                    if has_master
                    else "Platform master LLM keys are missing in backend .env."
                ),
            }
        )
    else:
        if not key_configs:
            err = ValueError("No API key configured in Plan & AI Vault for BYOK workspace.")
            classify_and_log_error(err, workspace_id=workspace_id, provider="byok")
            checks.append(
                {
                    "name": "BYOK Vault Credentials",
                    "passed": False,
                    "detail": "User Config Issue: Client has not saved an API key in Plan & AI Vault.",
                }
            )
        else:
            decrypt_ok = True
            providers_found: List[str] = []
            for cfg in key_configs:
                try:
                    raw_key = decrypt_api_key(cfg.encrypted_api_key)
                    if not raw_key or len(raw_key.strip()) < 8:
                        raise ValueError(f"Stored {cfg.provider} API key appears malformed or too short.")
                    providers_found.append(cfg.provider)
                except Exception as key_exc:
                    decrypt_ok = False
                    classify_and_log_error(key_exc, workspace_id=workspace_id, provider=cfg.provider)

            checks.append(
                {
                    "name": "BYOK AES-256 Key Vault",
                    "passed": decrypt_ok,
                    "detail": (
                        f"Verified encrypted keys for: {', '.join(sorted(set(providers_found)))}"
                        if decrypt_ok
                        else "Client key decryption or format check failed (logged as Client Fault)."
                    ),
                }
            )

    # Check 3: Recent Unresolved Critical Errors (Last 1 Hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_err = (
        db.query(SystemErrorLog)
        .filter(SystemErrorLog.workspace_id == ws_uuid)
        .order_by(desc(SystemErrorLog.created_at))
        .first()
    )
    has_recent_fault = False
    if recent_err and recent_err.created_at:
        ts = recent_err.created_at if recent_err.created_at.tzinfo else recent_err.created_at.replace(tzinfo=timezone.utc)
        has_recent_fault = ts >= one_hour_ago

    checks.append(
        {
            "name": "Recent Execution Telemetry (1h)",
            "passed": not has_recent_fault,
            "detail": (
                f"Latest fault ({recent_err.error_code}): {recent_err.error_message[:140]}"
                if has_recent_fault and recent_err
                else "Zero execution errors in the past 60 minutes."
            ),
        }
    )

    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    all_passed = all(c["passed"] for c in checks)

    return {
        "workspace_id": workspace_id,
        "workspace_name": ws.name,
        "overall_status": "healthy" if all_passed else "warning",
        "latency_ms": elapsed_ms,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }


@router.delete("/logs/{workspace_id}")
def clear_workspace_error_logs(
    workspace_id: str,
    x_admin_email: Optional[str] = Header(default=None, alias="X-Admin-Email"),
    db: Session = Depends(get_db),
):
    """Clears acknowledged warning/error logs for a workspace after issue resolution."""
    _verify_super_admin(x_admin_email)
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID format.")

    deleted = db.query(SystemErrorLog).filter(SystemErrorLog.workspace_id == ws_uuid).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": deleted}