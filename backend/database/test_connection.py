import sys
import os
from sqlalchemy import text
from dotenv import load_dotenv

# Ensure root directory is on Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

load_dotenv()

from backend.database.connection import engine, SessionLocal, Base
from backend.database.models import Workspace, User, AgentConfig
from backend.database.checkpointer import get_postgres_checkpointer

def verify_system_connections():
    """
    Executes structural health checks on Supabase PostgreSQL & LangGraph Checkpointer.
    """
    print("=" * 70)
    print("StarEleven AI SaaS Project - System Diagnostics & Verification")
    print("=" * 70)

    # 1. Test Raw Database Connection
    print("\n[1/3] Testing Direct Supabase PostgreSQL Connection...")
    db = None
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT version();")).fetchone()
        print(f" SUCCESS: Connected to Supabase PostgreSQL.")
        print(f" Engine Version: {result[0]}")
    except Exception as e:
        print(f" FAILED: Could not connect to Supabase database. Error: {e}")
        return False
    finally:
        if db:
            db.close()

    # 2. Test SQLAlchemy Model Table Creation
    print("\n[2/3] Verifying Multi-Tenant Relational Schemas (Tables)...")
    try:
        Base.metadata.create_all(bind=engine)
        print(" SUCCESS: Database schemas verified and synced (Workspaces, Users, AgentConfigs).")
    except Exception as e:
        print(f" FAILED: Schema synchronization failed. Error: {e}")
        return False

    # 3. Test LangGraph Postgres Checkpointer State Saver
    print("\n[3/3] Testing LangGraph State Persistence Checkpointer...")
    try:
        checkpointer = get_postgres_checkpointer()
        print(" SUCCESS: LangGraph PostgresSaver checkpointer initialized and table structure setup completed.")
    except Exception as e:
        print(f" FAILED: LangGraph Postgres checkpointer failed. Error: {e}")
        return False

    print("\n" + "=" * 60)
    print("ALL SYSTEM CONNECTIONS VERIFIED SUCCESSFULLY! READY FOR DEVELOPMENT.")
    print("=" * 60)
    return True

if __name__ == "__main__":
    verify_system_connections()