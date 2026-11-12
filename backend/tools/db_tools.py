from langchain_core.tools import tool
from sqlalchemy import text
from backend.database.connection import SessionLocal


@tool
def get_workspace_summary(workspace_id: str) -> str:
    """
    Retrieves tenant-isolated workspace metadata and active agent count
    from Supabase PostgreSQL for the given workspace_id.
    """
    db = SessionLocal()
    try:
        workspace = db.execute(
            text("SELECT id, name, slug, created_at FROM workspaces WHERE id = :wid"),
            {"wid": workspace_id},
        ).fetchone()

        if not workspace:
            return f"No workspace found for workspace_id: {workspace_id}"

        agent_count = db.execute(
            text("SELECT COUNT(*) FROM agent_configs WHERE workspace_id = :wid AND is_active = true"),
            {"wid": workspace_id},
        ).scalar()

        return (
            f"Workspace Name: {workspace.name} (Slug: {workspace.slug})\n"
            f"Workspace ID: {workspace.id}\n"
            f"Active Configured Agents: {agent_count or 0}"
        )
    except Exception as e:
        return f"Database lookup error: {str(e)}"
    finally:
        db.close()