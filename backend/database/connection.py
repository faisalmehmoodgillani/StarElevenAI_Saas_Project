import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in environment variables.")

# Ensure SQLAlchemy engine uses psycopg driver dialect
if DATABASE_URL.startswith("postgresql://"):
    engine_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    engine_url = DATABASE_URL

engine = create_engine(
    engine_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()