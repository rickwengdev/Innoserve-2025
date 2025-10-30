"""
資料抓取服務模組

負責所有與資料獲取相關的邏輯，包含：
1. 網頁爬蟲（HTML 文本抽取）
2. CSV 資料處理（政府開放資料平台）

支援的資料來源：
- 政府網站 HTML 網頁（勞動部、勞保局、法規資料庫）
- CSV 資料集（data.gov.tw API）

技術細節：
- 使用 BeautifulSoup 解析 HTML
- 使用 pandas 處理 CSV
- 自動處理 UTF-8 與 BIG5 編碼
- 過濾無關元素（導航列、側邊欄、腳本等）

@module services.scraping_service
@requires requests
@requires beautifulsoup4
@requires pandas
@author Innoserve Development Team
@version 1.0.0
"""
import logging
import requests
import pandas as pd
from io import StringIO
from bs4 import BeautifulSoup

def process_csv_url(url: str) -> str:
    """
    下載並處理 CSV 檔案，將其內容轉換為文字字串
    
    處理流程：
    1. 下載 CSV 資料（支援 UTF-8 與 BIG5 編碼自動偵測）
    2. 使用 pandas 解析 CSV
    3. 轉換為描述性文字格式（每列一行，格式：欄位名: 值）
    4. 回傳完整文本供向量化使用
    
    Args:
        url (str): CSV 資料來源 URL（通常是政府開放資料平台 API）
        
    Returns:
        str: 轉換後的文本內容，空字串表示處理失敗
        
    編碼處理：
        - 優先嘗試 UTF-8 解碼
        - 若出現亂碼（replacement characters），自動切換至 BIG5
        - 適應台灣政府網站常見的編碼問題
    
    錯誤處理：
        - 網路錯誤：記錄並回傳空字串
        - 解析錯誤：記錄並回傳空字串
        - 確保單一資料源失敗不影響整體更新流程
    
    Example:
        >>> text = process_csv_url('https://data.gov.tw/api/v1/rest/datastore_search?...')
        >>> print(text[:100])
        '縣市別: 台北市, 行業別: 製造業, 件數: 123
        縣市別: 新北市, 行業別: 營造業, 件數: 456...'
    """
    try:
        logging.info(f"正在處理 CSV URL: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=60)
        response.raise_for_status()
        
        # 嘗試使用 'utf-8' 或 'big5' 解碼，以應對台灣政府網站常見的編碼問題
        try:
            response.encoding = 'utf-8'
            csv_text = response.text
            # 檢查亂碼特徵（replacement characters）
            if '�' in csv_text:
                raise UnicodeDecodeError("UTF-8 decoding resulted in replacement characters")
        except UnicodeDecodeError:
            logging.warning(f"UTF-8 解碼失敗，嘗試使用 BIG5 解碼: {url}")
            response.encoding = 'big5'
            csv_text = response.text

        # 使用 StringIO 將字串回應當作檔案來處理，避免寫入實體檔案
        csv_file = StringIO(csv_text)
        df = pd.read_csv(csv_file)

        # 將 DataFrame 轉換為一段描述性的文字
        # 格式：欄位名: 值, 欄位名: 值, ...
        text_content = []
        for index, row in df.iterrows():
            # 將每一列的內容串連成 "欄位名: 值"，過濾掉空值
            row_text = ', '.join([f"{col}: {val}" for col, val in row.astype(str).items() if pd.notna(val) and str(val).strip()])
            text_content.append(row_text)

        full_text = "\n".join(text_content)
        logging.info(f"成功處理 CSV URL: {url}，轉換了 {len(df)} 筆資料。")
        return full_text

    except Exception as e:
        logging.error(f"處理 CSV URL 時發生錯誤: {url}, Error: {e}")
        return ""

def scrape_website_content(url: str) -> str:
    """
    爬取指定 URL 的主要文字內容
    
    使用 BeautifulSoup 解析 HTML 並抽取主要內容文字。
    自動過濾無關元素（導航列、腳本、樣式表等）。
    
    Args:
        url (str): 目標網頁 URL
        
    Returns:
        str: 抽取的文本內容，空字串表示爬取失敗
        
    爬蟲策略：
        1. 使用 User-Agent 模擬瀏覽器存取
        2. 移除無關標籤（script, style, nav, footer, header, aside）
        3. 優先抽取主要內容區塊（law-content, dataset-description, maincontent, cp）
        4. 若無特定區塊，則抽取 body 全部文字
    
    內容抽取優先順序：
        1. .law-content - 全國法規資料庫
        2. .dataset-description - 政府開放資料平台
        3. #maincontent - 勞動部官網
        4. .cp - 勞保局網站
        5. body - 預設全部內容
    
    錯誤處理：
        - 網路連線錯誤：記錄並回傳空字串
        - HTML 解析錯誤：記錄並回傳空字串
        - 超時設定：15 秒
    
    Note:
        - 使用 lxml 解析器（速度較快）
        - 自動偵測網頁編碼（response.apparent_encoding）
        - 文本使用換行符分隔，方便後續處理
    
    Example:
        >>> text = scrape_website_content('https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=N0030018')
        >>> print(text[:100])
        '勞工保險條例
        第一章 總則
        第 1 條
        為保障勞工生活，促進社會安全，制定本條例。...'
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        response.encoding = response.apparent_encoding

        soup = BeautifulSoup(response.text, 'lxml')

        # 移除無關標籤（導航、腳本、樣式等）
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()

        # 嘗試找到主要內容區塊（依優先順序）
        main_content = (soup.find('div', class_='law-content') or
                        soup.find('div', class_='dataset-description') or
                        soup.find('div', id='maincontent') or
                        soup.find('div', class_='cp') or
                        soup.body)

        # 抽取文本內容
        text = main_content.get_text(separator='\n', strip=True) if main_content else ""
        logging.info(f"成功爬取 URL: {url}，獲取 {len(text)} 字元")
        return text
    except requests.RequestException as e:
        logging.error(f"爬取 URL 時發生錯誤: {url}, Error: {e}")
        return ""