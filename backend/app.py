import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on sys.path for reliable module resolution
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.config import settings
from backend.api.v1 import api_v1_router

app = FastAPI(
    title=getattr(settings, "PROJECT_NAME", "StarEleven AI SaaS Platform"),
    version=getattr(settings, "VERSION", "1.0.0"),
    description="Multi-Tenant Agentic AI SaaS Backend powered by FastAPI, LangGraph, and Supabase.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular v1 API routes
app.include_router(api_v1_router)


@app.get("/", tags=["System Health"])
def health_check():
    """Root health check endpoint."""
    return {
        "status": "online",
        "project": getattr(settings, "PROJECT_NAME", "StarEleven AI SaaS Platform"),
        "version": getattr(settings, "VERSION", "1.0.0"),
    }