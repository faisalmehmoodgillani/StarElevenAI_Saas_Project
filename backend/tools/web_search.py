from langchain_core.tools import tool


@tool
def duckduckgo_web_search(query: str) -> str:
    """
    Searches the live web for free using DuckDuckGo for up-to-date market research,
    competitor insights, company details, and factual information.
    """
    clean_query = (query or "").strip()
    if not clean_query:
        return "Search query cannot be empty."

    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        results = []
        with DDGS() as ddgs:
            for item in ddgs.text(clean_query, max_results=5):
                results.append(item)

        if not results:
            return f"No live web results found for: '{clean_query}'."

        formatted = []
        for idx, item in enumerate(results, start=1):
            title = item.get("title", "Untitled")
            href = item.get("href") or item.get("url", "")
            body = item.get("body") or item.get("snippet", "")
            formatted.append(f"{idx}. {title}\nURL: {href}\nSummary: {body}")

        return "\n\n".join(formatted)
    except Exception as e:
        return f"DuckDuckGo search error: {str(e)}"


# Backward-compatible alias in case any existing module imports tavily_web_search
tavily_web_search = duckduckgo_web_search