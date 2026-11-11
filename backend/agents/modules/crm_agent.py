from langchain_core.messages import AIMessage
from backend.agents.base import AgentState
from backend.services.llm_factory import get_llm_instance

def run_crm_agent(state: AgentState) -> dict:
    llm = get_llm_instance(
        provider=state.get("provider", "google"),
        model_name=state.get("model_name", "gemini-2.5-flash"),
        encrypted_user_key=state.get("encrypted_api_key")
    )
    
    prompt = f"Qualify lead and respond to CRM inquiry:\n{state['messages'][-1].content}"
    response = llm.invoke(prompt)
    
    return {
        "messages": [AIMessage(content=f"[CRM Lead Qualification]\n{response.content}")],
        "final_response": response.content
    }