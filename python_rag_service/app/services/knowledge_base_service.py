"""
知識庫管理服務模組

負責管理 ChromaDB 知識庫的更新與維護，包含：
1. 從多個資料來源抓取最新資料（CSV、網頁）
2. 處理資料並轉換為文本格式
3. 分批上傳至 ChromaDB 向量資料庫（避免 API 頻率限制）
4. 定期更新知識庫（透過排程器）

架構說明：
- 與 scraping_service 協作處理資料抓取
- 實作批次上傳邏輯以符合 Google API 免費方案限制
- 提供完整的日誌記錄供除錯

API 限制處理：
- Google Gemini 免費方案：約 5 RPM (Requests Per Minute)
- 批次大小：CHUNK_SIZE = 4（每次處理 4 筆文件）
- 批次間延遲：DELAY_BETWEEN_CHUNKS = 10 秒

@module services.knowledge_base_service
@requires app
@requires config
@requires services.scraping_service
@author Rick
@version 1.0.0
"""
import logging
import time
from google.api_core import exceptions as google_exceptions

from app import collection
from config import DATA_SOURCES_URLS
# 導入兩種不同的資料處理函式
from .scraping_service import scrape_website_content, process_csv_url

# --- 批次處理設定 ---
# 根據 Google Gemini 免費方案限制 (約 5 RPM)，調整批次大小
# 每次呼叫 API 時處理的文件數量
CHUNK_SIZE = 4
# 每次處理完一批後，等待的秒數，以確保不會超過每分鐘的請求限制
# 設定為略多於一分鐘，以策安全
DELAY_BETWEEN_CHUNKS = 10

def is_csv_url(url: str) -> bool:
    """
    判斷 URL 是否指向 CSV 資料源
    
    檢查 URL 路徑是否包含政府開放資料平台的 API 端點或 .csv 副檔名。
    
    Args:
        url (str): 資料來源 URL
        
    Returns:
        bool: True 表示 CSV 資料源，False 表示網頁
        
    Note:
        - 政府開放資料平台 API: 'api/v1/rest/datastore'
        - 直接下載的 CSV 檔案: '.csv' 副檔名
        
    Example:
        >>> is_csv_url('https://data.gov.tw/api/v1/rest/datastore_search?...')
        True
        >>> is_csv_url('https://www.mol.gov.tw/1607/28162/...')
        False
    """
    return 'api/v1/rest/datastore' in url or url.lower().endswith('.csv')

def update_knowledge_base():
    """
    抓取最新的開放資料，並更新 ChromaDB 知識庫
    
    完整的知識庫更新流程：
    1. 遍歷所有資料來源 URL（來自 config.py）
    2. 根據 URL 類型選擇對應的處理方式（CSV 或網頁爬蟲）
    3. 收集所有成功抓取的文件
    4. 刪除資料庫中的舊文件
    5. 分批上傳新文件（避免 API 頻率限制）
    6. 記錄完整的執行日誌
    
    批次上傳策略：
        - 每批 CHUNK_SIZE 筆文件
        - 批次間延遲 DELAY_BETWEEN_CHUNKS 秒
        - 避免觸發 Google API 的 ResourceExhausted 錯誤
    
    錯誤處理：
        - 單一 URL 抓取失敗：記錄警告，繼續處理其他 URL
        - API 額度用完：記錄錯誤，終止更新
        - 其他未預期錯誤：記錄錯誤，確保服務穩定
    
    Returns:
        None
    
    Side Effects:
        - 更新 ChromaDB collection 的內容
        - 輸出詳細的日誌訊息
        - 執行時間：取決於資料來源數量與網路速度（約 5-10 分鐘）
    
    Note:
        - 此函式會被排程器定期呼叫（每日凌晨 3:00）
        - 服務啟動時也會立即執行一次
        - 確保資料來源可存取，否則知識庫可能為空
        
    Example:
        >>> update_knowledge_base()
        ===== 開始執行知識庫更新任務 =====
        正在處理 CSV URL: https://data.gov.tw/...
        成功處理 CSV URL: https://data.gov.tw/..., 轉換了 100 筆資料。
        ...
        成功更新知識庫，目前共有 500 筆文件。
        ===== 知識庫更新任務執行完畢 =====
    """
    logging.info("===== 開始執行知識庫更新任務 =====")
    
    all_docs = []
    # 步驟 1: 遍歷所有資料來源，抓取資料
    for i, url in enumerate(DATA_SOURCES_URLS):
        content = ""
        if is_csv_url(url):
            # 處理 CSV 資料源
            content = process_csv_url(url)
        else:
            # 處理網頁資料源
            content = scrape_website_content(url)
        
        if content:
            # 成功抓取，加入文件清單
            all_docs.append({
                "id": f"doc_{i+1}",
                "document": content,
                "metadata": {"source": url}
            })
        
        # 在爬取之間短暫延遲，避免對目標網站造成過大壓力
        time.sleep(1)

    # 步驟 2: 檢查是否有成功抓取的文件
    if not all_docs:
        logging.warning("未抓取到任何文件，本次更新終止。")
        return

    try:
        logging.info(f"準備更新資料庫，共 {len(all_docs)} 筆新文件。")
        
        # 步驟 3: 刪除所有舊文件（確保資料最新）
        if (existing_ids := collection.get(include=[])['ids']):
             logging.info(f"正在刪除 {len(existing_ids)} 筆舊文件...")
             collection.delete(ids=existing_ids)

        logging.info(f"將文件分成每組 {CHUNK_SIZE} 個進行處理，每組之間延遲 {DELAY_BETWEEN_CHUNKS} 秒。")
        
        # 步驟 4: 分批上傳文件，避免觸及 API 頻率限制
        for i in range(0, len(all_docs), CHUNK_SIZE):
            chunk = all_docs[i:i + CHUNK_SIZE]
            
            # 準備批次資料
            chunk_ids = [doc['id'] for doc in chunk]
            chunk_documents = [doc['document'] for doc in chunk]
            chunk_metadatas = [doc['metadata'] for doc in chunk]

            logging.info(f"正在處理第 {i//CHUNK_SIZE + 1} 組，共 {len(chunk)} 筆文件...")
            # 上傳至 ChromaDB（會自動進行向量化）
            collection.add(
                ids=chunk_ids,
                documents=chunk_documents,
                metadatas=chunk_metadatas
            )
            logging.info(f"第 {i//CHUNK_SIZE + 1} 組處理完畢。")

            # 如果這不是最後一批，則等待指定時間
            if i + CHUNK_SIZE < len(all_docs):
                logging.info(f"等待 {DELAY_BETWEEN_CHUNKS} 秒，以避免超過 API 請求頻率限制...")
                time.sleep(DELAY_BETWEEN_CHUNKS)

        # 步驟 5: 更新完成，記錄最終狀態
        logging.info(f"成功更新知識庫，目前共有 {collection.count()} 筆文件。")
        
    except google_exceptions.ResourceExhausted as e:
        # API 額度用完
        logging.error(f"!!! Google API 免費額度已用完，無法更新知識庫！錯誤: {e}")
    except Exception as e:
        # 其他未預期錯誤
        logging.error(f"更新 ChromaDB 時發生未預期的錯誤: {e}")
    
    logging.info("===== 知識庫更新任務執行完畢 =====")

