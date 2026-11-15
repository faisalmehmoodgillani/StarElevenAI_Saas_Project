import uuid
from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict

from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.types import interrupt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.agents.async_checkpointer import get_async_checkpointer
from backend.database.models import ChatThreadScope, WorkspaceAgent
from backend.services.integration_vault import list_workspace_connectors
from backend.services.llm_factory import get_llm_instance
from backend.tools.async_tool_runtime import (
    HITL_SENSITIVE_TOOL_NAMES,
    build_async_scoped_tools,
)


class ScopedAgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    workspace_id: str
    user_id: str
    provider: str
    model_name: str
    encrypted_api_key: Optional[str]
    active_agent_slug: str
    active_agent_name: str


def get_or_create_thread_scope(
    db: Session, workspace_id: str, thread_id: str
) -> Dict[str, List[str]]:
    wid = uuid.UUID(str(workspace_id))
    row = (
        db.query(ChatThreadScope)
        .filter(
            ChatThreadScope.workspace_id == wid,
            ChatThreadScope.thread_id == thread_id,
        )
        .first()
    )
    if not row:
        return {"pinned_agent_ids": [], "pinned_tool_ids": []}
    return {
        "pinned_agent_ids": list(row.pinned_agent_ids or []),
        "pinned_tool_ids": list(row.pinned_tool_ids or []),
    }


def detect_missing_tool_intent(
    user_message: str,
    connectors: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Lightweight keyword + connector check when user asks for an action whose connector
    is not connected yet in this workspace.
    """
    text_low = (user_message or "").lower()
    by_id = {c["connector_id"]: c for c in connectors}

    intent_rules = [
        (
            "google_workspace",
            ["gmail", "email", "inbox", "mail", "calendar", "meeting", "schedule", "appointment", "slot"],
            "Connect Google Workspace (1-Click OAuth) so your agent can read/send Gmail and manage Google Calendar.",
        ),
        (
            "whatsapp_cloud",
            ["whatsapp", "wa message", "meta message"],
            "Connect WhatsApp Cloud API in Connectors to send WhatsApp follow-ups.",
        ),
        (
            "slack_webhook",
            ["slack", "channel alert", "notify team"],
            "Connect Slack Team Alerts in Connectors to post messages to your Slack workspace.",
        ),
        (
            "custom_mcp",
            ["mcp", "hubspot", "notion", "zapier", "composio"],
            "Connect a Remote MCP Server URL in Agent Studio to unlock external MCP tools.",
        ),
    ]

    for cid, keywords, advice in intent_rules:
        conn = by_id.get(cid)
        if conn and not conn.get("is_connected"):
            if any(kw in text_low for kw in keywords):
                return {
                    "connector_id": cid,
                    "connector_name": conn["name"],
                    "auth_type": conn["auth_type"],
                    "advice": advice,
                }
    return None


async def build_scoped_execution_graph(
    db: Session,
    workspace_id: str,
    thread_id: str,
    override_agent_ids: Optional[List[str]] = None,
    override_tool_ids: Optional[List[str]] = None,
):
    """
    Dynamically compiles an async LangGraph workflow scoped STRICTLY to the user's
    pinned agents & tools for this chat thread (no artificial limit on count).
    """
    scope = get_or_create_thread_scope(db, workspace_id, thread_id)
    pinned_agent_ids = (
        override_agent_ids if override_agent_ids is not None else scope["pinned_agent_ids"]
    )
    pinned_tool_ids = (
        override_tool_ids if override_tool_ids is not None else scope["pinned_tool_ids"]
    )

    wid = uuid.UUID(str(workspace_id))
    pinned_agents: List[WorkspaceAgent] = []
    if pinned_agent_ids:
        valid_uuids = []
        for aid in pinned_agent_ids:
            try:
                valid_uuids.append(uuid.UUID(str(aid)))
            except ValueError:
                continue
        if valid_uuids:
            pinned_agents = (
                db.query(WorkspaceAgent)
                .filter(
                    WorkspaceAgent.workspace_id == wid,
                    WorkspaceAgent.id.in_(valid_uuids),
                    WorkspaceAgent.is_active == True,
                )
                .all()
            )

    # Collect ONLY connector IDs required by pinned agents + directly pinned tools
    required_connector_ids: List[str] = list(pinned_tool_ids)
    for ag in pinned_agents:
        for cid in (ag.bound_tools or []):
            if cid not in required_connector_ids:
                required_connector_ids.append(cid)

    connectors_catalog = list_workspace_connectors(db, workspace_id)
    tool_bundle = await build_async_scoped_tools(db, workspace_id, required_connector_ids)
    scoped_tools = tool_bundle["tools"]
    hitl_enabled_any = any(ag.hitl_enabled for ag in pinned_agents) if pinned_agents else True

    checkpointer = await get_async_checkpointer()
    workflow = StateGraph(ScopedAgentState)

    # CASE A: Blank-Slate Mode (0 agents & 0 tools pinned in this chat)
    if not pinned_agents and not scoped_tools:
        connected_names = [
            c["name"] for c in connectors_catalog if c.get("is_connected")
        ]
        unconnected_names = [
            f"{c['name']} ({c['connector_id']})"
            for c in connectors_catalog
            if not c.get("is_connected")
        ]

        async def blank_slate_copilot_node(state: ScopedAgentState) -> dict:
            llm = get_llm_instance(
                provider=state.get("provider", "groq"),
                model_name=state.get("model_name", "llama-3.3-70b-versatile"),
                encrypted_user_key=state.get("encrypted_api_key"),
                temperature=0.6,
            )
            sys_prompt = (
                "You are StarEleven AI Assistant. Currently, the user has NOT pinned any custom agent "
                "or external tool to this chat thread.\n"
                f"Workspace Connected Connectors: {', '.join(connected_names) or 'None'}.\n"
                f"Available Unconnected Connectors: {', '.join(unconnected_names) or 'None'}.\n"
                "Rules:\n"
                "1. Answer general strategy, drafting, coding, or business questions helpfully.\n"
                "2. If the user asks you to perform a live action (like checking/sending Gmail, booking Google Calendar, "
                "scraping a live URL, searching the live web, or calling an MCP tool), politely explain that no agent/tool "
                "is pinned to this chat yet, name the exact connector needed, and tell them they can connect/pin it in "
                "one click above or in Agent Studio (/agents). Never fabricate tool results."
            )
            response = await llm.ainvoke([SystemMessage(content=sys_prompt)] + state["messages"])
            return {
                "messages": [response],
                "active_agent_slug": "general_copilot",
                "active_agent_name": "General Copilot",
            }

        workflow.add_node("general_copilot", blank_slate_copilot_node)
        workflow.add_edge(START, "general_copilot")
        workflow.add_edge("general_copilot", END)
        return workflow.compile(checkpointer=checkpointer), connectors_catalog

    # CASE B: Scoped Multi-Agent / Tool Subgraph
    agent_profiles: List[Dict[str, Any]] = []
    for ag in pinned_agents:
        agent_profiles.append(
            {
                "slug": ag.slug,
                "name": ag.name,
                "role_title": ag.role_title,
                "system_prompt": ag.system_prompt,
                "bound_tools": ag.bound_tools or [],
                "hitl_enabled": bool(ag.hitl_enabled),
            }
        )

    if not agent_profiles:
        # User pinned tools directly without a named agent
        agent_profiles.append(
            {
                "slug": "scoped_tool_agent",
                "name": "Scoped Tool Copilot",
                "role_title": "Tool-Enabled Assistant",
                "system_prompt": (
                    "You are StarEleven Scoped Tool Copilot. Use the bound tools accurately to fulfill "
                    "the user's request, and also handle general conversation naturally."
                ),
                "bound_tools": pinned_tool_ids,
                "hitl_enabled": True,
            }
        )

    async def coordinator_node(state: ScopedAgentState) -> dict:
        if len(agent_profiles) == 1:
            chosen = agent_profiles[0]
            return {
                "active_agent_slug": chosen["slug"],
                "active_agent_name": chosen["name"],
            }

        # Multi-agent selector ONLY among user's pinned agents + general fallback
        slug_options = [a["slug"] for a in agent_profiles] + ["general_copilot"]
        descriptions = "\n".join(
            f"- {a['slug']}: {a['name']} ({a['role_title']}) | Tools: {', '.join(a['bound_tools']) or 'None'}"
            for a in agent_profiles
        )

        class PinnedRouteChoice(BaseModel):
            selected_slug: str = Field(
                description=f"Choose one slug from: {slug_options}"
            )

        llm = get_llm_instance(
            provider=state.get("provider", "groq"),
            model_name=state.get("model_name", "llama-3.3-70b-versatile"),
            encrypted_user_key=state.get("encrypted_api_key"),
            temperature=0.0,
        )
        router_prompt = (
            "Route the user's request to the best matching pinned specialist agent below, "
            "or choose 'general_copilot' if it is a general question unrelated to those agents:\n"
            f"{descriptions}"
        )
        try:
            structured = llm.with_structured_output(PinnedRouteChoice)
            decision = await structured.ainvoke(
                [SystemMessage(content=router_prompt)] + state["messages"][-4:]
            )
            chosen_slug = decision.selected_slug if decision.selected_slug in slug_options else agent_profiles[0]["slug"]
        except Exception:
            chosen_slug = agent_profiles[0]["slug"]

        if chosen_slug == "general_copilot":
            return {
                "active_agent_slug": "general_copilot",
                "active_agent_name": "General Copilot",
            }
        matched = next((a for a in agent_profiles if a["slug"] == chosen_slug), agent_profiles[0])
        return {
            "active_agent_slug": matched["slug"],
            "active_agent_name": matched["name"],
        }

    async def specialist_llm_node(state: ScopedAgentState) -> dict:
        active_slug = state.get("active_agent_slug") or agent_profiles[0]["slug"]
        llm = get_llm_instance(
            provider=state.get("provider", "groq"),
            model_name=state.get("model_name", "llama-3.3-70b-versatile"),
            encrypted_user_key=state.get("encrypted_api_key"),
            temperature=0.4,
        )

        if active_slug == "general_copilot":
            sys_msg = (
                "You are StarEleven General Copilot assisting alongside the user's pinned specialist agents. "
                "Provide clear, executive-quality answers."
            )
            reply = await llm.ainvoke([SystemMessage(content=sys_msg)] + state["messages"])
            return {"messages": [reply]}

        profile = next((a for a in agent_profiles if a["slug"] == active_slug), agent_profiles[0])
        llm_with_tools = llm.bind_tools(scoped_tools) if scoped_tools else llm
        reply = await llm_with_tools.ainvoke(
            [SystemMessage(content=profile["system_prompt"])] + state["messages"]
        )
        return {"messages": [reply]}

    def after_llm_edge(state: ScopedAgentState) -> str:
        last_msg = state["messages"][-1]
        tool_calls = getattr(last_msg, "tool_calls", None) or []
        if not tool_calls or not scoped_tools:
            return END

        if hitl_enabled_any:
            for tc in tool_calls:
                if tc.get("name") in HITL_SENSITIVE_TOOL_NAMES:
                    return "hitl_gate"
        return "tools"

    async def hitl_approval_gate(state: ScopedAgentState) -> dict:
        """
        Pauses execution via LangGraph `interrupt()` before executing sensitive external actions
        (sending Gmail, booking Calendar, posting Slack, sending WhatsApp).
        """
        last_msg = state["messages"][-1]
        tool_calls = getattr(last_msg, "tool_calls", None) or []
        sensitive_calls = [
            {"id": tc.get("id"), "name": tc.get("name"), "args": tc.get("args", {})}
            for tc in tool_calls
            if tc.get("name") in HITL_SENSITIVE_TOOL_NAMES
        ]

        decision = interrupt(
            {
                "type": "hitl_approval_required",
                "agent_name": state.get("active_agent_name", "Specialist Agent"),
                "actions": sensitive_calls,
                "message": "Approval required before executing external action.",
            }
        )

        approved = bool(
            decision is True
            or (isinstance(decision, dict) and decision.get("approved") is True)
        )
        if approved:
            return {}

        # If rejected, emit clean ToolMessages for every pending tool_call_id so conversation state stays valid
        rejection_reason = (
            decision.get("reason")
            if isinstance(decision, dict) and decision.get("reason")
            else "Action declined by user in Human-in-the-Loop review."
        )
        tool_rejections = [
            ToolMessage(
                tool_call_id=tc["id"],
                content=f"REJECTED BY HUMAN: {rejection_reason}. Do not execute this action; ask the user how they would like to proceed.",
            )
            for tc in tool_calls
            if tc.get("id")
        ]
        return {"messages": tool_rejections}

    def after_hitl_edge(state: ScopedAgentState) -> str:
        last_msg = state["messages"][-1]
        # If hitl_gate appended rejection ToolMessages, return to LLM so it can acknowledge politely
        if isinstance(last_msg, ToolMessage):
            return "specialist_agent"
        return "tools"

    workflow.add_node("coordinator", coordinator_node)
    workflow.add_node("specialist_agent", specialist_llm_node)
    workflow.add_edge(START, "coordinator")
    workflow.add_edge("coordinator", "specialist_agent")

    if scoped_tools:
        workflow.add_node("tools", ToolNode(scoped_tools))
        workflow.add_node("hitl_gate", hitl_approval_gate)
        workflow.add_conditional_edges(
            "specialist_agent",
            after_llm_edge,
            {"hitl_gate": "hitl_gate", "tools": "tools", END: END},
        )
        workflow.add_conditional_edges(
            "hitl_gate",
            after_hitl_edge,
            {"tools": "tools", "specialist_agent": "specialist_agent"},
        )
        workflow.add_edge("tools", "specialist_agent")
    else:
        workflow.add_edge("specialist_agent", END)

    return workflow.compile(checkpointer=checkpointer), connectors_catalog