import html
import re
import httpx
from langchain_core.tools import tool


@tool
def scrape_webpage_content(url: str) -> str:
    """
    Fetches and extracts clean text, page title, headings, and public contact emails
    from a given webpage URL for lead research, website audits, or competitor analysis.
    """
    target_url = (url or "").strip()
    if not target_url:
        return "Please provide a valid URL to scrape."
    if not target_url.startswith(("http://", "https://")):
        target_url = f"https://{target_url}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.get(target_url, headers=headers)
            resp.raise_for_status()
            raw_html = resp.text

        title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
        page_title = html.unescape(re.sub(r"\s+", " ", title_match.group(1))).strip() if title_match else "No Title"

        # Extract public emails visible on page
        emails = sorted(
            set(
                re.findall(
                    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                    raw_html,
                )
            )
        )
        filtered_emails = [
            e for e in emails if not e.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp", ".css", ".js"))
        ][:8]

        # Strip script, style, noscript, svg tags
        cleaned = re.sub(r"<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", raw_html, flags=re.IGNORECASE | re.DOTALL)
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = html.unescape(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        excerpt = cleaned[:4000]
        email_line = ", ".join(filtered_emails) if filtered_emails else "None found"

        return (
            f"URL: {target_url}\n"
            f"Title: {page_title}\n"
            f"Public Emails Found: {email_line}\n\n"
            f"Extracted Content:\n{excerpt}"
        )
    except Exception as e:
        return f"Failed to scrape '{target_url}': {str(e)}"