from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from langchain_core.messages import HumanMessage

from backend.config import settings
from backend.agents.router import agent_app

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    workspace_id: str
    user_id: str
    provider: Optional[str] = "groq"
    model_name: Optional[str] = "llama-3.3-70b-versatile"
    encrypted_api_key: Optional[str] = None

class ChatResponse(BaseModel):
    thread_id: str
    response: str
    intent: Optional[str]

@app.get("/")
def root_health():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    try:
        config = {"configurable": {"thread_id": payload.thread_id}}
        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "workspace_id": payload.workspace_id,
            "user_id": payload.user_id,
            "provider": payload.provider,
            "model_name": payload.model_name,
            "encrypted_api_key": payload.encrypted_api_key,
        }
        
        final_state = agent_app.invoke(initial_state, config=config)
        
        return ChatResponse(
            thread_id=payload.thread_id,
            response=final_state.get("final_response", "No response generated."),
            intent=final_state.get("intent")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))