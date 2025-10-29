"""
負責管理 ChromaDB 知識庫的更新與維護。
"""
import logging
import time
from google.api_core import exceptions as google_exceptions

from app import collection
from config import DATA_SOURCES_URLS
# 導入兩種不同的資料處理函式
from .scraping_service import scrape_website_content, process_csv_url

# --- 更新：分批處理設定 ---
# 根據最新的免費方案限制 (約 5 RPM)，調整批次大小
# 每次呼叫 API 時處理的文件數量
CHUNK_SIZE = 4
# 每次處理完一批後，等待的秒數，以確保不會超過每分鐘的請求限制
DELAY_BETWEEN_CHUNKS = 10 # 設定為略多於一分鐘，以策安全

def is_csv_url(url: str) -> bool:
    """
    判斷 URL 是否指向一個 CSV 資料源。
    """
    return 'api/v1/rest/datastore' in url or url.lower().endswith('.csv')

def update_knowledge_base():
    """抓取最新的開放資料，並更新 ChromaDB 知識庫。"""
    logging.info("===== 開始執行知識庫更新任務 =====")
    
    all_docs = []
    for i, url in enumerate(DATA_SOURCES_URLS):
        content = ""
        if is_csv_url(url):
            content = process_csv_url(url)
        else:
            content = scrape_website_content(url)
        
        if content:
            all_docs.append({
                "id": f"doc_{i+1}",
                "document": content,
                "metadata": {"source": url}
            })
        
        # 在爬取之間短暫延遲，避免對目標網站造成過大壓力
        time.sleep(1)

    if not all_docs:
        logging.warning("未抓取到任何文件，本次更新終止。")
        return

    try:
        logging.info(f"準備更新資料庫，共 {len(all_docs)} 筆新文件。")
        # 為了確保資料最新，先刪除所有舊文件
        if (existing_ids := collection.get(include=[])['ids']):
             logging.info(f"正在刪除 {len(existing_ids)} 筆舊文件...")
             collection.delete(ids=existing_ids)

        logging.info(f"將文件分成每組 {CHUNK_SIZE} 個進行處理，每組之間延遲 {DELAY_BETWEEN_CHUNKS} 秒。")
        
        # 將所有文件分批處理，以避免觸及 API 的頻率限制
        for i in range(0, len(all_docs), CHUNK_SIZE):
            chunk = all_docs[i:i + CHUNK_SIZE]
            
            chunk_ids = [doc['id'] for doc in chunk]
            chunk_documents = [doc['document'] for doc in chunk]
            chunk_metadatas = [doc['metadata'] for doc in chunk]

            logging.info(f"正在處理第 {i//CHUNK_SIZE + 1} 組，共 {len(chunk)} 筆文件...")
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

        logging.info(f"成功更新知識庫，目前共有 {collection.count()} 筆文件。")
    except google_exceptions.ResourceExhausted as e:
        logging.error(f"!!! Google API 免費額度已用完，無法更新知識庫！錯誤: {e}")
    except Exception as e:
        logging.error(f"更新 ChromaDB 時發生未預期的錯誤: {e}")
    
    logging.info("===== 知識庫更新任務執行完畢 =====")

