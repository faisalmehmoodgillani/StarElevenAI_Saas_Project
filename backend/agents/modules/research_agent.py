from langchain_core.messages import SystemMessage, ToolMessage
from backend.agents.base import AgentState
from backend.services.llm_factory import get_llm_instance
from backend.tools.web_search import tavily_web_search

RESEARCH_SYSTEM_PROMPT = (
    "You are the StarEleven Deep Research Specialist. "
    "Use the tavily_web_search tool whenever current web data, company research, "
    "or external facts are needed. Provide concise, structured, and accurate insights."
)


def run_research_agent(state: AgentState) -> dict:
    """Executes the Research Agent node with Tavily web search tool binding."""
    llm = get_llm_instance(
        provider=state.get("provider", "groq"),
        model_name=state.get("model_name", "llama-3.3-70b-versatile"),
        encrypted_user_key=state.get("encrypted_api_key"),
        temperature=0.3,
    )
    llm_with_tools = llm.bind_tools([tavily_web_search])

    messages = [SystemMessage(content=RESEARCH_SYSTEM_PROMPT)] + state["messages"]
    response = llm_with_tools.invoke(messages)

    # Execute tool call if requested by the model
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_messages = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "tavily_web_search":
                tool_output = tavily_web_search.invoke(tool_call["args"])
                tool_messages.append(
                    ToolMessage(
                        content=str(tool_output),
                        tool_call_id=tool_call["id"],
                    )
                )
        final_response = llm_with_tools.invoke(messages + [response] + tool_messages)
        return {"messages": [response, *tool_messages, final_response]}

    return {"messages": [response]}