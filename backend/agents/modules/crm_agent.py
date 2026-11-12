from langchain_core.messages import SystemMessage, ToolMessage
from backend.agents.base import AgentState
from backend.services.llm_factory import get_llm_instance
from backend.tools.db_tools import get_workspace_summary

CRM_SYSTEM_PROMPT = (
    "You are the StarEleven CRM & Lead Qualification Agent. "
    "Help businesses qualify inbound leads, structure follow-up sequences, "
    "and inspect workspace metrics using the available database tools. "
    "Always respect tenant data boundaries."
)


def run_crm_agent(state: AgentState) -> dict:
    """Executes the CRM Agent node with workspace-scoped DB tools."""
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key"),
        temperature=0.4,
    )
    llm_with_tools = llm.bind_tools([get_workspace_summary])

    workspace_context = f"\nCurrent Active Workspace ID: {state.get('workspace_id')}"
    messages = [SystemMessage(content=CRM_SYSTEM_PROMPT + workspace_context)] + state["messages"]
    response = llm_with_tools.invoke(messages)

    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_messages = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "get_workspace_summary":
                args = dict(tool_call["args"])
                args.setdefault("workspace_id", state.get("workspace_id", ""))
                tool_output = get_workspace_summary.invoke(args)
                tool_messages.append(
                    ToolMessage(
                        content=str(tool_output),
                        tool_call_id=tool_call["id"],
                    )
                )
        final_response = llm_with_tools.invoke(messages + [response] + tool_messages)
        return {"messages": [response, *tool_messages, final_response]}

    return {"messages": [response]}