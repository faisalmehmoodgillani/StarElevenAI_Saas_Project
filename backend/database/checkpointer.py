import os
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing for PostgresSaver.")

# Connection pool for LangGraph State Saver
pool = ConnectionPool(
    conninfo=DATABASE_URL,
    max_size=20,
    kwargs={"autocommit": True}
)

def get_postgres_checkpointer() -> PostgresSaver:
    """
    Initializes and returns PostgresSaver checkpointer instance.
    Creates necessary tables automatically on setup.
    """
    checkpointer = PostgresSaver(pool)
    checkpointer.setup()
    return checkpointer