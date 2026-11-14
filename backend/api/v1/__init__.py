from fastapi import APIRouter
from backend.api.v1.chat_routes import router as chat_router
from backend.api.v1.workspace_routes import router as workspace_router
from backend.api.v1.agent_routes import router as agent_router
from backend.api.v1.auth_sync import router as auth_sync_router
from backend.api.v1.team_routes import router as team_router


api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(chat_router)
api_v1_router.include_router(workspace_router)
api_v1_router.include_router(agent_router)
api_v1_router.include_router(auth_sync_router)
api_v1_router.include_router(team_router)