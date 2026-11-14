import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db

MANAGED_TIER_DEFAULT_LIMITS: Dict[str, int] = {
    "managed_starter": 2_000_000,
    "managed_growth": 10_000_000,
    "managed_enterprise": 35_000_000,
}

INDUSTRY_LABELS: Dict[str, str] = {
    "agency": "Marketing Agency",
    "real_estate": "Real Estate",
    "ecommerce": "E-Commerce",
    "healthcare": "Healthcare",
    "education": "Education",
    "saas": "SaaS & Tech",
    "other": "Other",
}


def _get_allowed_super_admins() -> set[str]:
    raw = os.getenv("SUPER_ADMIN_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def require_super_admin(
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
    x_admin_email: Optional[str] = Header(default=None, alias="X-Admin-Email"),
    admin_email: Optional[str] = Query(default=None),
) -> str:
    """
    Security boundary for all /api/v1/admin/* endpoints.
    Verifies caller email against SUPER_ADMIN_EMAILS configured in root .env.
    """
    allowed_admins = _get_allowed_super_admins()
    caller_email = (x_user_email or x_admin_email or admin_email or "").strip().lower()

    if not allowed_admins or not caller_email or caller_email not in allowed_admins:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Super Admin privileges are required to access this resource.",
        )
    return caller_email


router = APIRouter(
    prefix="/admin",
    tags=["Super Admin Command Center"],
    dependencies=[Depends(require_super_admin)],
)


class WorkspaceAdminDecisionRequest(BaseModel):
    action: Optional[
        Literal[
            "approve_managed",
            "reject_managed",
            "update_quota",
            "suspend",
            "reactivate",
        ]
    ] = Field(
        default=None,
        description="Administrative action to execute on the target workspace",
    )
    plan_tier: Optional[str] = Field(
        default=None,
        description="Target Managed plan tier (managed_starter, managed_growth, managed_enterprise)",
    )
    monthly_token_limit: Optional[int] = Field(
        default=None,
        ge=0,
        description="Custom monthly token limit for the workspace",
    )
    is_active: Optional[bool] = Field(
        default=None,
        description="Explicit workspace active status override",
    )


def _table_exists(db: Session, qualified_table: str) -> bool:
    try:
        res = db.execute(
            text("SELECT to_regclass(:tbl) IS NOT NULL AS exists_flag"),
            {"tbl": qualified_table},
        ).fetchone()
        return bool(res and res.exists_flag)
    except Exception:
        db.rollback()
        return False


def _fetch_auth_signup_providers(db: Session) -> Dict[str, str]:
    """
    Safely inspects Supabase auth.users metadata if accessible to determine signup provider
    (Google OAuth vs Email OTP / Password). Falls back gracefully if restricted.
    """
    providers: Dict[str, str] = {}
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    LOWER(TRIM(email)) AS email,
                    LOWER(COALESCE(raw_app_meta_data->>'provider', 'email')) AS provider
                FROM auth.users
                WHERE email IS NOT NULL
                """
            )
        ).fetchall()
        for r in rows:
            if r.email:
                providers[r.email] = r.provider
    except Exception:
        db.rollback()
    return providers


def _resolve_signup_method(
    email: str,
    hashed_password: Optional[str],
    auth_providers: Dict[str, str],
) -> str:
    provider = auth_providers.get(email.lower())
    if provider == "google":
        return "Google OAuth"
    if provider and provider != "email":
        return f"{provider.title()} OAuth"
    if not hashed_password or hashed_password == "SUPABASE_AUTH_MANAGED":
        return "Supabase Auth (OTP / OAuth)"
    return "Email & Password"


@router.get("/overview")
def get_admin_platform_overview(
    _admin_email: str = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Returns platform-wide KPIs, role breakdowns, token usage, and industry distribution."""
    # 1. Users & Role Breakdown across users + workspace_members
    user_rows = db.execute(
        text(
            """
            SELECT
                LOWER(TRIM(email)) AS email,
                LOWER(COALESCE(role, 'owner')) AS role
            FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            """
        )
    ).fetchall()

    member_rows = []
    if _table_exists(db, "public.workspace_members"):
        member_rows = db.execute(
            text(
                """
                SELECT
                    LOWER(TRIM(user_email)) AS email,
                    LOWER(COALESCE(role, 'operator')) AS role
                FROM workspace_members
                WHERE user_email IS NOT NULL AND TRIM(user_email) <> ''
                """
            )
        ).fetchall()

    role_by_email: Dict[str, str] = {}
    for r in user_rows:
        role_by_email[r.email] = "owner" if r.role in ("owner", "admin") else "operator"
    for m in member_rows:
        existing_role = role_by_email.get(m.email)
        incoming_role = "owner" if m.role in ("owner", "admin") else "operator"
        if existing_role != "owner":
            role_by_email[m.email] = incoming_role

    total_users = len(role_by_email)
    owners_count = sum(1 for r in role_by_email.values() if r == "owner")
    operators_count = sum(1 for r in role_by_email.values() if r == "operator")

    # 2. Workspaces Breakdown (Plan Mode, Plan Tier, Request Status, Active Status, Tokens, Industry)
    ws_rows = db.execute(
        text(
            """
            SELECT
                id,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                LOWER(COALESCE(industry, 'agency')) AS industry
            FROM workspaces
            """
        )
    ).fetchall()

    total_workspaces = len(ws_rows)
    active_workspaces = 0
    suspended_workspaces = 0
    by_plan_mode: Dict[str, int] = {"byok": 0, "managed": 0}
    by_plan_tier: Dict[str, int] = {
        "byok_free": 0,
        "managed_starter": 0,
        "managed_growth": 0,
        "managed_enterprise": 0,
    }
    by_request_status: Dict[str, int] = {
        "none": 0,
        "pending": 0,
        "approved": 0,
        "rejected": 0,
    }
    industry_counts: Dict[str, int] = {}
    total_tokens_consumed = 0
    total_monthly_token_quota = 0

    for w in ws_rows:
        if w.is_active:
            active_workspaces += 1
        else:
            suspended_workspaces += 1

        mode = w.plan_mode if w.plan_mode in ("byok", "managed") else "byok"
        by_plan_mode[mode] = by_plan_mode.get(mode, 0) + 1

        tier = w.plan_tier or "byok_free"
        by_plan_tier[tier] = by_plan_tier.get(tier, 0) + 1

        req_status = w.managed_request_status or "none"
        by_request_status[req_status] = by_request_status.get(req_status, 0) + 1

        total_tokens_consumed += int(w.tokens_used_this_month or 0)
        total_monthly_token_quota += int(w.monthly_token_limit or 0)

        ind = w.industry or "other"
        industry_counts[ind] = industry_counts.get(ind, 0) + 1

    industry_distribution = []
    for ind_key, count in sorted(industry_counts.items(), key=lambda x: x[1], reverse=True):
        pct = round((count / total_workspaces) * 100, 1) if total_workspaces > 0 else 0.0
        industry_distribution.append(
            {
                "industry": ind_key,
                "label": INDUSTRY_LABELS.get(ind_key, ind_key.replace("_", " ").title()),
                "count": count,
                "percentage": pct,
            }
        )

    # 3. Total Configured Agents
    agent_count_row = db.execute(
        text("SELECT COUNT(*) AS cnt FROM agent_configs")
    ).fetchone()
    total_configured_agents = int(agent_count_row.cnt or 0) if agent_count_row else 0

    # 4. Total Conversations / Threads from LangGraph Checkpointer
    total_conversations = 0
    if _table_exists(db, "public.checkpoints"):
        try:
            conv_row = db.execute(
                text("SELECT COUNT(DISTINCT thread_id) AS cnt FROM checkpoints")
            ).fetchone()
            total_conversations = int(conv_row.cnt or 0) if conv_row else 0
        except Exception:
            db.rollback()
            total_conversations = 0

    return {
        "total_users": total_users,
        "owners_count": owners_count,
        "operators_count": operators_count,
        "total_workspaces": total_workspaces,
        "active_workspaces": active_workspaces,
        "suspended_workspaces": suspended_workspaces,
        "workspaces_by_plan_mode": by_plan_mode,
        "workspaces_by_plan_tier": by_plan_tier,
        "workspaces_by_request_status": by_request_status,
        "total_configured_agents": total_configured_agents,
        "total_conversations": total_conversations,
        "total_tokens_consumed": total_tokens_consumed,
        "total_monthly_token_quota": total_monthly_token_quota,
        "industry_distribution": industry_distribution,
    }


@router.get("/users")
def get_admin_users_directory(
    _admin_email: str = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Returns all registered users with signup methods, owned/joined workspaces,
    billing quotas, status, configured agents, and pending Managed Plan requests.
    """
    auth_providers = _fetch_auth_signup_providers(db)

    # 1. Fetch all workspaces
    ws_rows = db.execute(
        text(
            """
            SELECT
                id,
                name,
                slug,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                requested_plan_tier,
                LOWER(COALESCE(billing_interval, 'monthly')) AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end,
                LOWER(COALESCE(industry, 'agency')) AS industry,
                created_at
            FROM workspaces
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    # 2. Fetch configured agents grouped by workspace_id
    agent_rows = db.execute(
        text(
            """
            SELECT
                id,
                workspace_id,
                agent_type,
                provider,
                model_name,
                (encrypted_api_key IS NOT NULL AND TRIM(encrypted_api_key) <> '') AS has_custom_key,
                COALESCE(is_active, TRUE) AS is_active,
                created_at
            FROM agent_configs
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    agents_by_ws: Dict[str, List[Dict[str, Any]]] = {}
    for a in agent_rows:
        wid = str(a.workspace_id)
        agents_by_ws.setdefault(wid, []).append(
            {
                "id": str(a.id),
                "agent_type": a.agent_type,
                "provider": a.provider,
                "model_name": a.model_name,
                "has_custom_key": bool(a.has_custom_key),
                "is_active": bool(a.is_active),
            }
        )

    workspaces_by_id: Dict[str, Dict[str, Any]] = {}
    for w in ws_rows:
        wid = str(w.id)
        limit = int(w.monthly_token_limit or 0)
        used = int(w.tokens_used_this_month or 0)
        usage_pct = round(min(100.0, (used / limit) * 100), 1) if limit > 0 else 0.0

        workspaces_by_id[wid] = {
            "id": wid,
            "workspace_id": wid,
            "name": w.name,
            "slug": w.slug,
            "industry": w.industry,
            "plan_tier": w.plan_tier,
            "plan_mode": w.plan_mode,
            "requested_plan_tier": w.requested_plan_tier,
            "billing_interval": w.billing_interval,
            "managed_request_status": w.managed_request_status,
            "managed_approved": bool(w.managed_approved),
            "tokens_used_this_month": used,
            "monthly_token_limit": limit,
            "usage_percent": usage_pct,
            "billing_cycle_end": (
                w.billing_cycle_end.isoformat() if w.billing_cycle_end else None
            ),
            "is_active": bool(w.is_active),
            "configured_agents": agents_by_ws.get(wid, []),
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }

    # 3. Fetch primary users table
    user_rows = db.execute(
        text(
            """
            SELECT
                id,
                workspace_id,
                LOWER(TRIM(email)) AS email,
                hashed_password,
                full_name,
                LOWER(COALESCE(role, 'owner')) AS role,
                created_at
            FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    users_map: Dict[str, Dict[str, Any]] = {}
    ws_owner_lookup: Dict[str, Dict[str, str]] = {}

    for u in user_rows:
        email = u.email
        wid = str(u.workspace_id) if u.workspace_id else None
        normalized_role = "owner" if u.role in ("owner", "admin") else "operator"
        full_name = (u.full_name or "").strip() or email.split("@")[0]

        users_map[email] = {
            "user_id": str(u.id),
            "email": email,
            "full_name": full_name,
            "primary_role": normalized_role,
            "signup_method": _resolve_signup_method(
                email, u.hashed_password, auth_providers
            ),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "_workspace_roles": {},
        }

        if wid and wid in workspaces_by_id:
            users_map[email]["_workspace_roles"][wid] = normalized_role
            if normalized_role == "owner":
                ws_owner_lookup[wid] = {"email": email, "full_name": full_name}

    # 4. Merge workspace_memberships so multi-workspace owners & invited operators are included
    if _table_exists(db, "public.workspace_members"):
        member_rows = db.execute(
            text(
                """
                SELECT
                    workspace_id,
                    LOWER(TRIM(user_email)) AS email,
                    user_id,
                    LOWER(COALESCE(role, 'operator')) AS role,
                    created_at
                FROM workspace_members
                WHERE user_email IS NOT NULL AND TRIM(user_email) <> ''
                ORDER BY created_at ASC
                """
            )
        ).fetchall()

        for m in member_rows:
            email = m.email
            wid = str(m.workspace_id) if m.workspace_id else None
            member_role = "owner" if m.role in ("owner", "admin") else "operator"

            if email not in users_map:
                users_map[email] = {
                    "user_id": str(m.user_id) if m.user_id else email,
                    "email": email,
                    "full_name": email.split("@")[0],
                    "primary_role": member_role,
                    "signup_method": _resolve_signup_method(email, None, auth_providers),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "_workspace_roles": {},
                }
            elif member_role == "owner":
                users_map[email]["primary_role"] = "owner"

            if wid and wid in workspaces_by_id:
                existing_ws_role = users_map[email]["_workspace_roles"].get(wid)
                if existing_ws_role != "owner":
                    users_map[email]["_workspace_roles"][wid] = member_role

                if member_role == "owner" and wid not in ws_owner_lookup:
                    ws_owner_lookup[wid] = {
                        "email": email,
                        "full_name": users_map[email]["full_name"],
                    }

    # 5. Assemble final user list with nested workspaces
    formatted_users: List[Dict[str, Any]] = []
    for email, udata in users_map.items():
        ws_roles: Dict[str, str] = udata.pop("_workspace_roles")
        nested_workspaces: List[Dict[str, Any]] = []
        owned_count = 0
        joined_count = 0

        for wid, mrole in ws_roles.items():
            ws_copy = dict(workspaces_by_id[wid])
            ws_copy["member_role"] = mrole
            nested_workspaces.append(ws_copy)
            if mrole == "owner":
                owned_count += 1
            else:
                joined_count += 1

        udata["total_workspaces"] = len(nested_workspaces)
        udata["owned_workspaces_count"] = owned_count
        udata["joined_workspaces_count"] = joined_count
        udata["workspaces"] = nested_workspaces
        formatted_users.append(udata)

    # Sort users by created_at descending
    formatted_users.sort(
        key=lambda item: item.get("created_at") or "",
        reverse=True,
    )

    # 6. Build Pending Managed Plan Approval Queue
    pending_requests: List[Dict[str, Any]] = []
    for wid, ws_data in workspaces_by_id.items():
        if ws_data["managed_request_status"] == "pending":
            req_tier = (ws_data.get("requested_plan_tier") or "managed_starter").lower()
            if req_tier not in MANAGED_TIER_DEFAULT_LIMITS:
                req_tier = "managed_starter"
            owner_info = ws_owner_lookup.get(
                wid, {"email": "owner@workspace.local", "full_name": "Workspace Owner"}
            )
            pending_requests.append(
                {
                    "workspace_id": wid,
                    "workspace_name": ws_data["name"],
                    "slug": ws_data["slug"],
                    "industry": ws_data["industry"],
                    "owner_email": owner_info["email"],
                    "owner_name": owner_info["full_name"],
                    "requested_plan_tier": req_tier,
                    "billing_interval": ws_data["billing_interval"],
                    "current_monthly_token_limit": ws_data["monthly_token_limit"],
                    "default_monthly_token_limit": MANAGED_TIER_DEFAULT_LIMITS[req_tier],
                    "created_at": ws_data["created_at"],
                }
            )

    return {
        "total_users": len(formatted_users),
        "users": formatted_users,
        "pending_managed_requests": pending_requests,
    }


@router.patch("/workspaces/{workspace_id}/decision")
def execute_workspace_admin_decision(
    workspace_id: str,
    payload: WorkspaceAdminDecisionRequest,
    _admin_email: str = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Super Admin endpoint to approve/reject Managed Plan requests,
    configure monthly token limits, or suspend/reactivate workspaces.
    """
    try:
        uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace UUID format.")

    ws = db.execute(
        text(
            """
            SELECT
                id,
                name,
                slug,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                requested_plan_tier,
                LOWER(COALESCE(billing_interval, 'monthly')) AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end,
                LOWER(COALESCE(industry, 'agency')) AS industry
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    updates: List[str] = []
    params: Dict[str, Any] = {"wid": workspace_id}
    action = payload.action

    if action == "approve_managed":
        resolved_tier = (
            (payload.plan_tier or ws.requested_plan_tier or "managed_starter")
            .strip()
            .lower()
        )
        if resolved_tier not in MANAGED_TIER_DEFAULT_LIMITS:
            resolved_tier = "managed_starter"

        resolved_limit = (
            int(payload.monthly_token_limit)
            if payload.monthly_token_limit is not None and payload.monthly_token_limit > 0
            else MANAGED_TIER_DEFAULT_LIMITS[resolved_tier]
        )
        cycle_end = datetime.now(timezone.utc) + timedelta(days=30)

        updates.extend(
            [
                "plan_mode = 'managed'",
                "plan_tier = :plan_tier",
                "requested_plan_tier = NULL",
                "managed_approved = TRUE",
                "managed_request_status = 'approved'",
                "monthly_token_limit = :monthly_token_limit",
                "billing_cycle_end = :billing_cycle_end",
            ]
        )
        params["plan_tier"] = resolved_tier
        params["monthly_token_limit"] = resolved_limit
        params["billing_cycle_end"] = cycle_end

    elif action == "reject_managed":
        updates.extend(
            [
                "plan_mode = 'byok'",
                "plan_tier = 'byok_free'",
                "requested_plan_tier = NULL",
                "managed_approved = FALSE",
                "managed_request_status = 'rejected'",
                "monthly_token_limit = 0",
            ]
        )

    elif action == "suspend":
        updates.append("is_active = FALSE")

    elif action == "reactivate":
        updates.append("is_active = TRUE")

    elif action == "update_quota":
        if payload.monthly_token_limit is None:
            raise HTTPException(
                status_code=400,
                detail="monthly_token_limit is required when action is 'update_quota'.",
            )
        updates.append("monthly_token_limit = :monthly_token_limit")
        params["monthly_token_limit"] = int(payload.monthly_token_limit)

    else:
        # Support direct field updates when action is omitted
        if payload.monthly_token_limit is not None:
            updates.append("monthly_token_limit = :monthly_token_limit")
            params["monthly_token_limit"] = int(payload.monthly_token_limit)
        if payload.is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = bool(payload.is_active)
        if payload.plan_tier is not None:
            clean_tier = payload.plan_tier.strip().lower()
            if clean_tier in MANAGED_TIER_DEFAULT_LIMITS:
                updates.append("plan_tier = :plan_tier")
                params["plan_tier"] = clean_tier

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No valid administrative decision or field update provided.",
        )

    updated = db.execute(
        text(
            f"""
            UPDATE workspaces
            SET {', '.join(updates)}
            WHERE id = CAST(:wid AS UUID)
            RETURNING
                id,
                name,
                slug,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                requested_plan_tier,
                LOWER(COALESCE(billing_interval, 'monthly')) AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end,
                LOWER(COALESCE(industry, 'agency')) AS industry
            """
        ),
        params,
    ).fetchone()
    db.commit()

    limit = int(updated.monthly_token_limit or 0)
    used = int(updated.tokens_used_this_month or 0)
    usage_pct = round(min(100.0, (used / limit) * 100), 1) if limit > 0 else 0.0

    return {
        "status": "updated",
        "action": action or "direct_update",
        "workspace": {
            "id": str(updated.id),
            "workspace_id": str(updated.id),
            "name": updated.name,
            "slug": updated.slug,
            "is_active": bool(updated.is_active),
            "plan_mode": updated.plan_mode,
            "plan_tier": updated.plan_tier,
            "requested_plan_tier": updated.requested_plan_tier,
            "billing_interval": updated.billing_interval,
            "managed_approved": bool(updated.managed_approved),
            "managed_request_status": updated.managed_request_status,
            "monthly_token_limit": limit,
            "tokens_used_this_month": used,
            "usage_percent": usage_pct,
            "billing_cycle_end": (
                updated.billing_cycle_end.isoformat()
                if updated.billing_cycle_end
                else None
            ),
            "industry": updated.industry,
        },
    }