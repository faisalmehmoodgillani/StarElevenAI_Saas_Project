import os
from typing import Optional
from urllib.parse import quote_plus

from langgraph.checkpoint.memory import MemorySaver

_async_pool = None
_async_checkpointer = None
_memory_fallback = MemorySaver()


def _resolve_postgres_uri() -> Optional[str]:
    raw_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("SUPABASE_DB_URL")
        or os.getenv("POSTGRES_URL")
        or ""
    ).strip()
    if raw_url:
        if raw_url.startswith("postgresql+psycopg://"):
            return raw_url.replace("postgresql+psycopg://", "postgresql://", 1)
        if raw_url.startswith("postgresql+asyncpg://"):
            return raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return raw_url

    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    dbname = os.getenv("DB_NAME", "postgres")
    port = os.getenv("DB_PORT", "5432")
    if host and user and password:
        return f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"
    return None


async def get_async_checkpointer():
    """
    Returns an initialized AsyncPostgresSaver backed by psycopg AsyncConnectionPool
    for non-blocking LangGraph streaming & HITL interrupts.
    """
    global _async_pool, _async_checkpointer

    if _async_checkpointer is not None:
        return _async_checkpointer

    db_uri = _resolve_postgres_uri()
    if not db_uri:
        return _memory_fallback

    try:
        from psycopg_pool import AsyncConnectionPool
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        if _async_pool is None:
            _async_pool = AsyncConnectionPool(
                conninfo=db_uri,
                max_size=10,
                open=False,
                kwargs={"autocommit": True, "prepare_threshold": 0},
            )
            await _async_pool.open()

        saver = AsyncPostgresSaver(_async_pool)
        await saver.setup()
        _async_checkpointer = saver
        return _async_checkpointer
    except Exception:
        return _memory_fallback