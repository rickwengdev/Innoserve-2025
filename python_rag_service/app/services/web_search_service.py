"""
Google 網頁搜尋服務模組

提供 Google 自訂搜尋 API 整合，作為知識庫的後援搜尋機制。

核心功能：
1. 使用 Google Custom Search JSON API 搜尋網頁
2. 下載搜尋結果的主體文字內容
3. 回傳精簡上下文供 LLM 使用

使用場景：
- 知識庫無相關資料時的後援方案
- 需要即時網路資訊時
- 擴充 RAG 系統的資料來源

環境變數要求：
- GOOGLE_SEARCH_API_KEY: Google API 金鑰（可重用現有的 Gemini 金鑰）
- GOOGLE_CSE_ID: Programmable Search Engine ID（必要）

設定步驟：
1. 前往 https://programmablesearchengine.google.com/ 建立搜尋引擎
2. 取得 CSE ID（Search engine ID）
3. 在 Google Cloud Console 啟用 Custom Search API
4. 設定環境變數 GOOGLE_CSE_ID

@module services.web_search_service
@requires requests
@requires services.scraping_service
@author Innoserve Development Team
@version 1.0.0
"""
import os
import logging
from typing import List, Dict
import requests

from .scraping_service import scrape_website_content

# 從環境變數讀取 Google 搜尋 API 設定
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")

# Google Custom Search API 端點
SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


def google_search(query: str, num: int = 3) -> List[Dict]:
    """
    使用 Google Custom Search API 搜尋網頁
    
    執行 Google 搜尋並回傳結果清單（包含標題、連結、摘要）。
    
    Args:
        query (str): 搜尋查詢字串
        num (int, optional): 回傳結果數量，預設 3（最多 10）
        
    Returns:
        list: 搜尋結果清單，格式為：
            [
                {
                    "title": str,    # 網頁標題
                    "link": str,     # 網頁 URL
                    "snippet": str   # 搜尋摘要
                },
                ...
            ]
            若未設定 API 金鑰或發生錯誤，回傳空清單 []
    
    API 限制：
        - 免費方案：100 次搜尋/天
        - 每次最多回傳 10 筆結果
        - 需要同時設定 GOOGLE_CSE_ID 和 GOOGLE_SEARCH_API_KEY
    
    錯誤處理：
        - 缺少 API 金鑰：記錄警告，回傳空清單
        - 網路錯誤：記錄錯誤，回傳空清單
        - API 錯誤：記錄錯誤，回傳空清單
    
    Note:
        - 使用 zh-TW 語言設定，優先顯示繁體中文結果
        - 超時設定：15 秒
    
    Example:
        >>> results = google_search("職業傷害申請流程", num=3)
        >>> for r in results:
        ...     print(f"{r['title']}: {r['link']}")
        勞工保險局-職業傷害申請: https://www.bli.gov.tw/...
        勞動部-職災保護: https://www.mol.gov.tw/...
    """
    if not GOOGLE_CSE_ID or not GOOGLE_SEARCH_API_KEY:
        logging.warning("缺少 GOOGLE_CSE_ID 或 GOOGLE_SEARCH_API_KEY，跳過 Google 搜尋後援")
        return []
    try:
        params = {
            "key": GOOGLE_SEARCH_API_KEY,
            "cx": GOOGLE_CSE_ID,
            "q": query,
            "num": max(1, min(num, 10)),  # 限制在 1-10 之間
            "hl": "zh-TW",  # 繁體中文
        }
        resp = requests.get(SEARCH_ENDPOINT, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        
        # 整理搜尋結果
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
    搜尋並擷取前 top_k 筆網頁文字，組成精簡上下文供 LLM 使用
    
    結合 Google 搜尋與網頁爬蟲，自動抓取搜尋結果的主要內容。
    
    Args:
        query (str): 搜尋查詢字串
        top_k (int, optional): 處理前幾筆搜尋結果，預設 2
        char_limit (int, optional): 每個網頁最多擷取幾個字元，預設 1800
        
    Returns:
        str: 組合後的網頁內容文字，格式為：
            【來源】標題
            URL
            【內容】
            網頁文字內容...
            
            【來源】標題
            URL
            【內容】
            網頁文字內容...
            
            若搜尋失敗或無法抓取內容，回傳空字串 ""
    
    處理流程：
        1. 使用 google_search() 取得搜尋結果
        2. 對前 top_k 筆結果使用 scrape_website_content() 抓取內容
        3. 截取每個網頁的前 char_limit 個字元
        4. 組合成格式化的上下文文字
    
    字元限制理由：
        - 避免 LLM 輸入過長（超過 token 限制）
        - 提高回應速度
        - 確保上下文精簡有用
    
    錯誤處理：
        - 單一網頁抓取失敗：跳過該網頁，繼續處理下一筆
        - 所有網頁都失敗：回傳空字串
    
    Note:
        - 重用 scraping_service.scrape_website_content() 進行網頁爬蟲
        - 自動過濾無效的 URL（空連結）
        - 適合作為 RAG 系統的後援資料來源
    
    Example:
        >>> context = build_web_context("職業傷害申請流程", top_k=2, char_limit=1000)
        >>> print(context)
        【來源】勞工保險局-職業傷害申請
        https://www.bli.gov.tw/0100637.html
        【內容】
        職業傷害申請流程如下：
        1. 填寫申請書
        2. 檢附相關證明文件...
        
        【來源】勞動部-職災保護
        https://www.mol.gov.tw/...
        【內容】
        職業災害保護法規定...
    """
    # 步驟 1: 執行 Google 搜尋
    results = google_search(query, num=top_k)
    if not results:
        return ""
    
    # 步驟 2: 抓取前 top_k 筆網頁內容
    chunks = []
    for r in results[:top_k]:
        url = r.get("link")
        title = r.get("title")
        if not url:
            continue
        
        # 抓取網頁內容
        content = scrape_website_content(url)
        if not content:
            continue
        
        # 截取字元限制
        content = content[:char_limit]
        
        # 格式化為結構化文字
        chunks.append(f"【來源】{title}\n{url}\n【內容】\n{content}")
    
    # 步驟 3: 組合所有網頁內容
    return "\n\n".join(chunks)
