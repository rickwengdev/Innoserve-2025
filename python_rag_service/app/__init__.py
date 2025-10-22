"""
應用程式工廠 (Application Factory)：初始化 Flask 應用和所有核心組件。
這個檔案是整個 Python 應用的心臟。
"""
import os
from dotenv import load_dotenv
load_dotenv()
import logging
import google.generativeai as genai
from flask import Flask
import chromadb
from chromadb.utils import embedding_functions
from apscheduler.schedulers.background import BackgroundScheduler

# --- 1. 基本設定 ---
# 設定日誌格式，方便在 Docker logs 中追蹤
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
print("正在初始化 Gemini RAG 服務 (結構化版本)...")

# --- 2. 初始化核心組件 (這些物件將被其他模組導入使用) ---

# 建立 Flask 應用程式實例
app = Flask(__name__)

# 從環境變數讀取 Google API 金鑰
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    # 如果找不到金鑰，服務將無法啟動並拋出錯誤
    raise ValueError("請設定 GOOGLE_API_KEY 環境變數")
# 設定 Gemini SDK
genai.configure(api_key=api_key)

# 初始化 ChromaDB Client，並指定一個持久化的儲存路徑
# 這個路徑會被 docker-compose.yml 掛載到一個 volume，確保資料不會遺失
chroma_client = chromadb.PersistentClient(path="/data/chroma_db")

# 建立一個 Google 生成式 AI 的 Embedding Function
# 並且明確指定使用 'embedding-001' 模型，以提高穩定性並避免免費方案的額度問題
google_ef = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
    api_key=api_key,
    model_name="models/embedding-001"
)

# 獲取或建立一個名為 "rag_collection" 的集合 (Collection)
# 這個集合會使用我們上面定義的 embedding_function 來自動將文件轉換為向量
collection = chroma_client.get_or_create_collection(
    name="rag_collection",
    embedding_function=google_ef
)

# 初始化用於生成答案的大型語言模型 (LLM)
generation_model = genai.GenerativeModel('gemini-2.5-pro')

# 初始化背景排程器，用於執行定時任務 (例如每日更新知識庫)
scheduler = BackgroundScheduler(daemon=True)

# --- 3. 導入並註冊路由 ---
# 這行程式碼必須放在所有核心組件初始化之後，以避免循環導入 (Circular Import) 的問題
# 它會去讀取 app/routes.py 檔案，將裡面定義的 API 端點註冊到 Flask app 中
from app import routes

