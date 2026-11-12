import os
from langchain_core.tools import tool
from dotenv import load_dotenv

load_dotenv()


@tool
def tavily_web_search(query: str) -> str:
    """
    Searches the live web using Tavily API for up-to-date market research,
    competitor insights, and factual information.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or api_key == "your_tavily_search_api_key":
        return "Web search unavailable: TAVILY_API_KEY is not configured in environment."

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, search_depth="basic", max_results=5)
        results = response.get("results", [])

        if not results:
            return f"No web results found for query: '{query}'."

        formatted_results = []
        for idx, item in enumerate(results, start=1):
            title = item.get("title", "Untitled")
            url = item.get("url", "")
            content = item.get("content", "")
            formatted_results.append(f"{idx}. {title}\nURL: {url}\nSummary: {content}")

        return "\n\n".join(formatted_results)
    except Exception as e:
        return f"Web search execution failed: {str(e)}"