"""
Google 搜尋服務：
- 以 Google Custom Search JSON API 搜尋網頁
- 下載前幾筆結果的主體文字（重用 scraping_service）
- 回傳可供 LLM 使用的精簡上下文

環境變數：
- GOOGLE_SEARCH_API_KEY: 使用現有的金鑰
- GOOGLE_CSE_ID: 你的 Programmable Search Engine ID（必要）
"""
import os
import logging
from typing import List, Dict
import requests

from .scraping_service import scrape_website_content

GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")

SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


def google_search(query: str, num: int = 3) -> List[Dict]:
    """
    使用 Google Custom Search API 搜尋，回傳 [{title, link, snippet}]
    若未設定 CSE 或 API KEY，回傳空陣列。
    """
    if not GOOGLE_CSE_ID or not GOOGLE_SEARCH_API_KEY:
        logging.warning("缺少 GOOGLE_CSE_ID 或 GOOGLE_SEARCH_API_KEY，跳過 Google 搜尋後援")
        return []
    try:
        params = {
            "key": GOOGLE_SEARCH_API_KEY,
            "cx": GOOGLE_CSE_ID,
            "q": query,
            "num": max(1, min(num, 10)),
            "hl": "zh-TW",
        }
        resp = requests.get(SEARCH_ENDPOINT, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        results = []
        for it in items:
            results.append({
                "title": it.get("title", ""),
                "link": it.get("link", ""),
                "snippet": it.get("snippet", "")
            })
        return results
    except Exception as e:
        logging.error(f"Google 搜尋發生錯誤: {e}")
        return []


def build_web_context(query: str, top_k: int = 2, char_limit: int = 1800) -> str:
    """
    搜尋並擷取前 top_k 筆頁面文字，組成簡潔上下文供 LLM 使用。
    """
    results = google_search(query, num=top_k)
    if not results:
        return ""
    chunks = []
    for r in results[:top_k]:
        url = r.get("link")
        title = r.get("title")
        if not url:
            continue
        content = scrape_website_content(url)
        if not content:
            continue
        content = content[:char_limit]
        chunks.append(f"【來源】{title}\n{url}\n【內容】\n{content}")
    return "\n\n".join(chunks)
