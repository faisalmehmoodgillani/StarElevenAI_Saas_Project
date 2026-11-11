from typing import TypedDict, Annotated, List, Optional
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    workspace_id: str
    user_id: str
    intent: Optional[str]
    provider: str
    model_name: str
    encrypted_api_key: Optional[str]
    final_response: Optional[str]

class RouterDecision(BaseModel):
    intent: str = Field(description="Selected module: 'research', 'crm', or 'general'")
    reasoning: str = Field(description="Explanation of routing decision")