from typing import Optional
from pydantic import BaseModel, Field


class AgentConfigCreateRequest(BaseModel):
    workspace_id: str = Field(..., description="Target workspace UUID")
    agent_type: str = Field(..., description="Agent identifier (e.g., crm_agent, research_agent)")
    provider: str = Field(default="groq", description="LLM provider name")
    model_name: str = Field(default="llama-3.3-70b-versatile", description="Model identifier")
    api_key: Optional[str] = Field(
        default=None,
        description="Plain API key (encrypted with AES-256 before database storage)",
    )
    settings_json: Optional[dict] = Field(
        default_factory=dict,
        description="Custom agent metadata and tool settings",
    )


class AgentConfigResponse(BaseModel):
    agent_config_id: str
    workspace_id: str
    agent_type: str
    provider: str
    model_name: str
    has_custom_encrypted_key: bool