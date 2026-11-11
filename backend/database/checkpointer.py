import os
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing for PostgresSaver.")

# psycopg pool requires standard postgresql:// scheme
if DATABASE_URL.startswith("postgresql+psycopg://"):
    conninfo = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
else:
    conninfo = DATABASE_URL

pool = ConnectionPool(
    conninfo=conninfo,
    max_size=20,
    kwargs={"autocommit": True}
)

def get_postgres_checkpointer() -> PostgresSaver:
    checkpointer = PostgresSaver(pool)
    checkpointer.setup()
    return checkpointer