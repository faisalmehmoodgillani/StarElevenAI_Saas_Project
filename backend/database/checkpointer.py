import os
import psycopg
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing for PostgresSaver checkpointer.")

# psycopg pool requires standard postgresql:// URI scheme
if DATABASE_URL.startswith("postgresql+psycopg://"):
    conninfo = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
else:
    conninfo = DATABASE_URL

pool = ConnectionPool(
    conninfo=conninfo,
    max_size=20,
    kwargs={"autocommit": True},
)


def get_postgres_checkpointer() -> PostgresSaver:
    """Initializes and returns the Supabase PostgresSaver checkpointer."""
    checkpointer = PostgresSaver(pool)
    checkpointer.setup()
    return checkpointer


def delete_thread_checkpoints(workspace_id: str, thread_id: str) -> dict:
    """
    Permanently deletes all LangGraph state records for a workspace-scoped thread
    ({workspace_id}:{thread_id}) across checkpoints, checkpoint_blobs, and checkpoint_writes.
    """
    clean_ws = workspace_id.strip()
    clean_tid = thread_id.strip()
    if not clean_ws or not clean_tid:
        raise ValueError("Both workspace_id and thread_id are required.")

    composite_thread_id = (
        clean_tid
        if clean_tid.startswith(f"{clean_ws}:")
        else f"{clean_ws}:{clean_tid}"
    )

    writes_deleted = 0
    blobs_deleted = 0
    checkpoints_deleted = 0

    try:
        with pool.connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM checkpoint_writes WHERE thread_id = %s",
                        (composite_thread_id,),
                    )
                    writes_deleted = cur.rowcount or 0

                    cur.execute(
                        "DELETE FROM checkpoint_blobs WHERE thread_id = %s",
                        (composite_thread_id,),
                    )
                    blobs_deleted = cur.rowcount or 0

                    cur.execute(
                        "DELETE FROM checkpoints WHERE thread_id = %s",
                        (composite_thread_id,),
                    )
                    checkpoints_deleted = cur.rowcount or 0
    except psycopg.errors.UndefinedTable:
        # Tables have not been initialized yet; treat as idempotent zero-delete
        pass

    return {
        "status": "deleted",
        "workspace_id": clean_ws,
        "thread_id": clean_tid,
        "composite_thread_id": composite_thread_id,
        "deleted_counts": {
            "checkpoints": checkpoints_deleted,
            "checkpoint_blobs": blobs_deleted,
            "checkpoint_writes": writes_deleted,
        },
    }