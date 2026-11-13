from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt or query")
    thread_id: str = Field(..., min_length=1, description="Conversation session/thread ID")
    workspace_id: str = Field(..., min_length=1, description="Tenant workspace UUID")
    user_id: str = Field(..., min_length=1, description="Authenticated user UUID")
    provider: str = Field(
        default="groq",
        description="LLM provider: groq, google, openai, anthropic, openrouter",
    )
    model_name: str = Field(default="openai/gpt-oss-20b", description="Target LLM model identifier")
    encrypted_api_key: Optional[str] = Field(
        default=None,
        description="Optional workspace encrypted API key",
    )


class ChatResponse(BaseModel):
    thread_id: str
    workspace_id: str
    routed_agent: str
    response: str


class ThreadMessage(BaseModel):
    role: str
    content: str


class ThreadHistoryResponse(BaseModel):
    thread_id: str
    workspace_id: str
    last_routed_agent: Optional[str] = None
    messages: list[ThreadMessage]