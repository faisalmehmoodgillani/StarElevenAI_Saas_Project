import logging
import re
import uuid
from dataclasses import dataclass
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import InterfaceError, OperationalError, TimeoutError as SQLAlchemyTimeoutError
from starlette.middleware.base import BaseHTTPMiddleware

from backend.database.connection import SessionLocal
from backend.database.models import SystemErrorLog

logger = logging.getLogger("stareleven.observability")

UUID_REGEX = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)


@dataclass
class ClassifiedFault:
    error_code: str
    is_client_fault: bool
    severity: str  # "WARNING" | "CRITICAL"
    category_label: str
    sanitized_message: str


def classify_exception(
    exc: Exception,
    provider: Optional[str] = None,
    is_managed_workspace: bool = False,
) -> ClassifiedFault:
    """
    Distinguishes between Client Configuration/BYOK Faults (is_client_fault=True)
    and Platform Infrastructure Outages (is_client_fault=False).
    """
    raw_msg = str(exc) or exc.__class__.__name__
    msg_lower = raw_msg.lower()
    exc_type_lower = exc.__class__.__name__.lower()
    prov = (provider or "").strip().lower()

    # 1. Platform Infrastructure Faults (DB, Pooler, Redis)
    if (
        isinstance(exc, (OperationalError, InterfaceError, SQLAlchemyTimeoutError))
        or "psycopg" in msg_lower
        or "ssl connection has been closed" in msg_lower
        or "server closed the connection unexpectedly" in msg_lower
        or "connection refused" in msg_lower
        and ("5432" in msg_lower or "6543" in msg_lower or "postgres" in msg_lower or "supabase" in msg_lower)
        or "queuepool limit" in msg_lower
    ):
        return ClassifiedFault(
            error_code="SUPABASE_DB_TIMEOUT",
            is_client_fault=False,
            severity="CRITICAL",
            category_label="Platform Infrastructure Error",
            sanitized_message=f"Supabase PostgreSQL / Session Pooler connection failure: {raw_msg[:500]}",
        )

    if (
        "redis" in exc_type_lower
        or "redis" in msg_lower
        or ("6379" in msg_lower and ("connection" in msg_lower or "timeout" in msg_lower))
    ):
        return ClassifiedFault(
            error_code="REDIS_DISCONNECT",
            is_client_fault=False,
            severity="CRITICAL",
            category_label="Platform Infrastructure Error",
            sanitized_message=f"Redis cache/queue connection interrupted: {raw_msg[:500]}",
        )

    # 2. External Channel / OAuth Token Faults (Client Config)
    if (
        "whatsapp" in msg_lower
        or "graph.facebook.com" in msg_lower
        or ("oauthexception" in msg_lower and ("190" in msg_lower or "access token" in msg_lower))
    ):
        return ClassifiedFault(
            error_code="EXPIRED_META_WHATSAPP_TOKEN",
            is_client_fault=True,
            severity="WARNING",
            category_label="User Config Issue — Platform Operational",
            sanitized_message=f"Meta WhatsApp Cloud API token expired or invalid: {raw_msg[:500]}",
        )

    if "invalid_grant" in msg_lower or (
        "google" in msg_lower and ("token has been expired or revoked" in msg_lower or "refresh_token" in msg_lower)
    ):
        return ClassifiedFault(
            error_code="EXPIRED_GOOGLE_OAUTH_TOKEN",
            is_client_fault=True,
            severity="WARNING",
            category_label="User Config Issue — Platform Operational",
            sanitized_message=f"Workspace Google OAuth token expired or revoked: {raw_msg[:500]}",
        )

    # 3. LLM Quota / Rate Limit Faults
    if (
        "resource_exhausted" in msg_lower
        or "quota exceeded" in msg_lower
        or ("gemini" in msg_lower or prov == "google")
        and ("429" in msg_lower or "quota" in msg_lower or "rate limit" in msg_lower)
    ):
        if is_managed_workspace:
            return ClassifiedFault(
                error_code="MANAGED_GEMINI_QUOTA_EXCEEDED",
                is_client_fault=False,
                severity="CRITICAL",
                category_label="Platform Infrastructure Error",
                sanitized_message=f"Platform managed Gemini quota reached: {raw_msg[:500]}",
            )
        return ClassifiedFault(
            error_code="GEMINI_QUOTA_EXCEEDED",
            is_client_fault=True,
            severity="WARNING",
            category_label="User Config Issue — Platform Operational",
            sanitized_message=f"Client Gemini API key quota exceeded: {raw_msg[:500]}",
        )

    # 4. Invalid / Missing LLM API Keys
    is_auth_failure = any(
        token in msg_lower
        for token in (
            "invalid_api_key",
            "invalid api key",
            "incorrect api key",
            "authentication_error",
            "api_key_invalid",
            "unauthorized",
            "401",
            "no api key configured",
            "plan & ai vault",
        )
    )

    if is_auth_failure:
        if is_managed_workspace:
            return ClassifiedFault(
                error_code="MANAGED_MASTER_KEY_ERROR",
                is_client_fault=False,
                severity="CRITICAL",
                category_label="Platform Infrastructure Error",
                sanitized_message=f"Platform master LLM key authentication failed ({prov or 'unknown'}): {raw_msg[:500]}",
            )

        if "openai" in msg_lower or prov == "openai":
            code = "INVALID_OPENAI_KEY"
        elif "groq" in msg_lower or prov == "groq":
            code = "INVALID_GROQ_KEY"
        elif "anthropic" in msg_lower or "claude" in msg_lower or prov == "anthropic":
            code = "INVALID_ANTHROPIC_KEY"
        elif "gemini" in msg_lower or "google" in msg_lower or prov == "google":
            code = "INVALID_GEMINI_KEY"
        elif "openrouter" in msg_lower or prov == "openrouter":
            code = "INVALID_OPENROUTER_KEY"
        else:
            code = "INVALID_BYOK_API_KEY"

        return ClassifiedFault(
            error_code=code,
            is_client_fault=True,
            severity="WARNING",
            category_label="User Config Issue — Platform Operational",
            sanitized_message=f"Client BYOK credential rejected ({code}): {raw_msg[:500]}",
        )

    # 5. Fallback: Unhandled Platform Exception
    return ClassifiedFault(
        error_code="UNHANDLED_SERVER_EXCEPTION",
        is_client_fault=False,
        severity="CRITICAL",
        category_label="Platform Infrastructure Error",
        sanitized_message=f"{exc.__class__.__name__}: {raw_msg[:500]}",
    )


def _parse_workspace_uuid(workspace_id: Optional[str]) -> Optional[uuid.UUID]:
    if not workspace_id:
        return None
    try:
        return uuid.UUID(str(workspace_id).strip())
    except (ValueError, TypeError):
        return None


def record_system_error(
    error_code: str,
    error_message: str,
    is_client_fault: bool,
    severity: str = "WARNING",
    workspace_id: Optional[str] = None,
) -> Optional[str]:
    """
    Safely writes an observability record to system_error_logs without ever
    crashing the caller if the database itself is unreachable.
    """
    normalized_severity = severity.upper() if severity else "WARNING"
    if normalized_severity not in ("WARNING", "CRITICAL"):
        normalized_severity = "WARNING"

    db = SessionLocal()
    try:
        log_entry = SystemErrorLog(
            workspace_id=_parse_workspace_uuid(workspace_id),
            error_code=error_code[:100],
            error_message=error_message[:2000],
            is_client_fault=bool(is_client_fault),
            severity=normalized_severity,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return str(log_entry.id)
    except Exception as db_err:
        db.rollback()
        logger.error("Failed to persist SystemErrorLog (%s): %s", error_code, db_err)
        return None
    finally:
        db.close()


def classify_and_log_error(
    exc: Exception,
    workspace_id: Optional[str] = None,
    provider: Optional[str] = None,
    is_managed_workspace: bool = False,
) -> ClassifiedFault:
    """
    Classifies an exception and immediately persists it to system_error_logs.
    Ideal for direct use inside SSE chat streams, LLM factory, and connector calls.
    """
    fault = classify_exception(
        exc=exc,
        provider=provider,
        is_managed_workspace=is_managed_workspace,
    )
    record_system_error(
        error_code=fault.error_code,
        error_message=fault.sanitized_message,
        is_client_fault=fault.is_client_fault,
        severity=fault.severity,
        workspace_id=workspace_id,
    )
    return fault


def _extract_workspace_id_from_request(request: Request) -> Optional[str]:
    header_wid = request.headers.get("X-Workspace-ID") or request.headers.get("x-workspace-id")
    if header_wid and _parse_workspace_uuid(header_wid):
        return header_wid.strip()

    query_wid = request.query_params.get("workspace_id")
    if query_wid and _parse_workspace_uuid(query_wid):
        return query_wid.strip()

    match = UUID_REGEX.search(request.url.path)
    if match:
        return match.group(0)

    return None


class ErrorObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Global FastAPI middleware that intercepts unhandled exceptions, DB/Redis
    infrastructure outages, and misconfigured client keys, recording them into
    system_error_logs with clear fault attribution.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            workspace_id = _extract_workspace_id_from_request(request)
            fault = classify_and_log_error(
                exc=exc,
                workspace_id=workspace_id,
                provider=request.headers.get("X-LLM-Provider"),
            )

            status_code = 422 if fault.is_client_fault else 500
            return JSONResponse(
                status_code=status_code,
                content={
                    "detail": fault.sanitized_message,
                    "error_code": fault.error_code,
                    "fault_attribution": fault.category_label,
                    "is_client_fault": fault.is_client_fault,
                    "severity": fault.severity,
                },
            )