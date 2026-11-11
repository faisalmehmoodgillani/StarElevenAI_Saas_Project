from langgraph.graph import StateGraph, END, START
from backend.agents.base import AgentState, RouterDecision
from backend.agents.modules.research_agent import run_research_agent
from backend.agents.modules.crm_agent import run_crm_agent
from backend.services.llm_factory import get_llm_instance
from backend.database.checkpointer import get_postgres_checkpointer

def route_intent(state: AgentState) -> dict:
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key")
    )
    
    structured_llm = llm.with_structured_output(RouterDecision)
    last_user_msg = state["messages"][-1].content
    
    decision = structured_llm.invoke(
        f"Categorize user request into 'research', 'crm', or 'general':\n{last_user_msg}"
    )
    
    return {"intent": decision.intent}

def route_condition(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent == "research":
        return "research_agent"
    elif intent == "crm":
        return "crm_agent"
    return "general_agent"

def run_general_agent(state: AgentState) -> dict:
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key")
    )
    response = llm.invoke(state["messages"])
    return {"messages": [response], "final_response": response.content}

def create_agent_graph():
    builder = StateGraph(AgentState)
    
    builder.add_node("intent_router", route_intent)
    builder.add_node("research_agent", run_research_agent)
    builder.add_node("crm_agent", run_crm_agent)
    builder.add_node("general_agent", run_general_agent)
    
    builder.add_edge(START, "intent_router")
    builder.add_conditional_edges(
        "intent_router",
        route_condition,
        {
            "research_agent": "research_agent",
            "crm_agent": "crm_agent",
            "general_agent": "general_agent"
        }
    )
    
    builder.add_edge("research_agent", END)
    builder.add_edge("crm_agent", END)
    builder.add_edge("general_agent", END)
    
    checkpointer = get_postgres_checkpointer()
    return builder.compile(checkpointer=checkpointer)

agent_app = create_agent_graph()