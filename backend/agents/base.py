from typing import Annotated, Literal, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Shared state passed across all nodes in the StarEleven Multi-Agent Graph."""
    messages: Annotated[list[BaseMessage], add_messages]
    workspace_id: str
    user_id: str
    provider: str
    model_name: str
    encrypted_api_key: Optional[str]
    next_node: str


class RouteDecision(BaseModel):
    """Structured output schema for deterministic intent classification."""
    next_agent: Literal["research_agent", "crm_agent", "general_agent"] = Field(
        description=(
            "Choose 'research_agent' for web search, market analysis, or fact-finding; "
            "'crm_agent' for lead qualification, sales pipeline, or workspace CRM data; "
            "'general_agent' for general assistance, drafting, or standard conversation."
        )
    )
    reasoning: str = Field(description="Brief explanation for selecting this agent.")