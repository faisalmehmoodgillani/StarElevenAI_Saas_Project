from langchain_core.messages import AIMessage
from backend.agents.base import AgentState
from backend.services.llm_factory import get_llm_instance

def run_research_agent(state: AgentState) -> dict:
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key")
    )
    
    prompt = f"Execute deep research query for the following context:\n{state['messages'][-1].content}"
    response = llm.invoke(prompt)
    
    return {
        "messages": [AIMessage(content=f"[Research Agent Output]\n{response.content}")],
        "final_response": response.content
    }