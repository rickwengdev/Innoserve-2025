"""
負責所有與資料獲取相關的邏輯 (網頁爬取與 CSV 處理)。
"""
import logging
import requests
import pandas as pd
from io import StringIO
from bs4 import BeautifulSoup

def process_csv_url(url: str) -> str:
    """下載並處理 CSV 檔案，將其內容轉換為單一文字字串"""
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
            # 檢查亂碼特徵
            if '' in csv_text:
                raise UnicodeDecodeError("UTF-8 decoding resulted in replacement characters")
        except UnicodeDecodeError:
            logging.warning(f"UTF-8 解碼失敗，嘗試使用 BIG5 解碼: {url}")
            response.encoding = 'big5'
            csv_text = response.text

        # 使用 StringIO 將字串回應當作檔案來處理，避免寫入實體檔案
        csv_file = StringIO(csv_text)
        df = pd.read_csv(csv_file)

        # 將 DataFrame 轉換為一段描述性的文字
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
    """爬取指定 URL 的主要文字內容"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        response.encoding = response.apparent_encoding

        soup = BeautifulSoup(response.text, 'lxml')

        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()

        main_content = (soup.find('div', class_='law-content') or
                        soup.find('div', class_='dataset-description') or
                        soup.find('div', id='maincontent') or
                        soup.find('div', class_='cp') or
                        soup.body)

        text = main_content.get_text(separator='\n', strip=True) if main_content else ""
        logging.info(f"成功爬取 URL: {url}，獲取 {len(text)} 字元")
        return text
    except requests.RequestException as e:
        logging.error(f"爬取 URL 時發生錯誤: {url}, Error: {e}")
        return ""