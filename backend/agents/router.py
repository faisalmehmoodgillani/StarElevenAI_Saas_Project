from typing import Literal
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, END

from backend.agents.base import AgentState, RouteDecision
from backend.agents.modules.research_agent import run_research_agent
from backend.agents.modules.crm_agent import run_crm_agent
from backend.services.llm_factory import get_llm_instance
from backend.database.checkpointer import get_postgres_checkpointer

ROUTER_SYSTEM_PROMPT = (
    "You are the Central Intent Router for StarEleven AI SaaS. "
    "Analyze the user's latest message and route it to the most appropriate specialist agent."
)

GENERAL_SYSTEM_PROMPT = (
    "You are StarEleven AI Assistant, an enterprise B2B operations and automation copilot. "
    "Deliver clear, actionable, and professional responses."
)


def intent_router_node(state: AgentState) -> dict:
    """Uses structured LLM output to classify intent and select target agent."""
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key"),
        temperature=0.0,
    )
    structured_router = llm.with_structured_output(RouteDecision)
    decision: RouteDecision = structured_router.invoke(
        [SystemMessage(content=ROUTER_SYSTEM_PROMPT)] + state["messages"]
    )
    return {"next_node": decision.next_agent}


def general_agent_node(state: AgentState) -> dict:
    """Handles general business queries and standard assistant conversations."""
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key"),
        temperature=0.7,
    )
    response = llm.invoke([SystemMessage(content=GENERAL_SYSTEM_PROMPT)] + state["messages"])
    return {"messages": [response]}


def route_decision(state: AgentState) -> Literal["research_agent", "crm_agent", "general_agent"]:
    """Conditional edge resolver."""
    return state.get("next_node", "general_agent")


def build_agent_graph(use_checkpointer: bool = True):
    """Builds and compiles the multi-tenant LangGraph workflow."""
    workflow = StateGraph(AgentState)

    workflow.add_node("router", intent_router_node)
    workflow.add_node("research_agent", run_research_agent)
    workflow.add_node("crm_agent", run_crm_agent)
    workflow.add_node("general_agent", general_agent_node)

    workflow.add_edge(START, "router")
    workflow.add_conditional_edges(
        "router",
        route_decision,
        {
            "research_agent": "research_agent",
            "crm_agent": "crm_agent",
            "general_agent": "general_agent",
        },
    )
    workflow.add_edge("research_agent", END)
    workflow.add_edge("crm_agent", END)
    workflow.add_edge("general_agent", END)

    checkpointer = get_postgres_checkpointer() if use_checkpointer else None
    return workflow.compile(checkpointer=checkpointer)