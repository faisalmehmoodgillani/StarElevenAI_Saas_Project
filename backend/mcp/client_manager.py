import asyncio
import json
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool

from backend.database.models import WorkspaceIntegration
from backend.services.security import decrypt_api_key


def _build_mcp_connection_config(
    mcp_url: str,
    encrypted_credentials: Optional[str] = None,
) -> Dict[str, Any]:
    """Builds transport config for HTTP/SSE Remote MCP servers from DB record."""
    clean_url = (mcp_url or "").strip()
    transport = "sse" if clean_url.endswith("/sse") or "sse" in clean_url.lower() else "streamable_http"

    headers: Dict[str, str] = {}
    if encrypted_credentials:
        try:
            creds = json.loads(decrypt_api_key(encrypted_credentials))
            bearer = (creds.get("bearer_token") or creds.get("api_key") or "").strip()
            if bearer:
                headers["Authorization"] = f"Bearer {bearer}"
        except Exception:
            pass

    cfg: Dict[str, Any] = {
        "transport": transport,
        "url": clean_url,
    }
    if headers:
        cfg["headers"] = headers
    return cfg


async def _async_fetch_mcp_tools(server_map: Dict[str, Dict[str, Any]]) -> List[BaseTool]:
    """Connects to specified MCP servers and retrieves LangChain-compatible BaseTools."""
    if not server_map:
        return []
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
    except ImportError:
        return []

    client = MultiServerMCPClient(server_map)
    return await client.get_tools()


def _run_coro_sync(coro: Any) -> Any:
    """Safely executes an async coroutine from sync or async FastAPI/LangGraph contexts."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result(timeout=25)
    return asyncio.run(coro)


def load_mcp_tools_for_integrations(integrations: List[WorkspaceIntegration]) -> List[BaseTool]:
    """
    Loads tools ONLY for the passed list of pinned MCP WorkspaceIntegration rows.
    If a workspace has 100 MCPs configured, only the 1-3 rows passed here are connected.
    """
    server_map: Dict[str, Dict[str, Any]] = {}
    for row in integrations:
        if row.is_connected and row.mcp_url:
            server_map[row.connector_id] = _build_mcp_connection_config(
                mcp_url=row.mcp_url,
                encrypted_credentials=row.encrypted_credentials,
            )

    if not server_map:
        return []

    try:
        return _run_coro_sync(_async_fetch_mcp_tools(server_map))
    except Exception:
        return []


def discover_mcp_server_tools(
    mcp_url: str,
    bearer_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Probes a Remote MCP Server URL when saved in the UI so available tool names
    and descriptions can be cached in Supabase (`cached_tools`).
    """
    clean_url = (mcp_url or "").strip()
    if not clean_url:
        return {"ok": False, "tools": [], "error": "MCP URL is required."}

    transport = "sse" if clean_url.endswith("/sse") or "sse" in clean_url.lower() else "streamable_http"
    cfg: Dict[str, Any] = {"transport": transport, "url": clean_url}
    if bearer_token and bearer_token.strip():
        cfg["headers"] = {"Authorization": f"Bearer {bearer_token.strip()}"}

    try:
        tools = _run_coro_sync(_async_fetch_mcp_tools({"probe_mcp": cfg}))
        tool_names = [t.name for t in tools] if tools else ["dynamic_mcp_tools"]
        return {"ok": True, "tools": tool_names, "count": len(tools)}
    except Exception as e:
        return {"ok": False, "tools": ["dynamic_mcp_tools"], "error": str(e)}