import uuid
from langchain_core.tools import tool
from backend.database.connection import SessionLocal
from backend.database.models import Workspace, AgentConfig


@tool
def get_workspace_summary(workspace_id: str) -> str:
    """
    Retrieves tenant-isolated workspace metadata and configured agent count
    from Supabase PostgreSQL for the given workspace_id.
    """
    db = SessionLocal()
    try:
        wid = uuid.UUID(workspace_id)
        workspace = db.query(Workspace).filter(Workspace.id == wid).first()

        if not workspace:
            return f"No workspace found for workspace_id: {workspace_id}"

        agents = db.query(AgentConfig).filter(AgentConfig.workspace_id == wid).all()
        agent_types = ", ".join([a.agent_type for a in agents]) if agents else "None"

        return (
            f"Workspace Name: {workspace.name} (Slug: {workspace.slug})\n"
            f"Workspace ID: {workspace.id}\n"
            f"Status: {'Active' if workspace.is_active else 'Inactive'}\n"
            f"Configured Agents ({len(agents)}): {agent_types}"
        )
    except ValueError:
        return f"Invalid UUID format for workspace_id: {workspace_id}"
    except Exception as e:
        return f"Database lookup error: {str(e)}"
    finally:
        db.close()