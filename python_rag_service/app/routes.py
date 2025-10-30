"""
API 路由定義模組

提供三個主要 API 端點：
1. /chat - 帶對話記憶的聊天機器人 (需 JWT 驗證)
2. /generate - 純 RAG 問答 (需 JWT 驗證)
3. /search (隱含) - Google 網頁搜尋後援

架構說明：
- JWTAuth 類別：JWT 驗證工具，提供 token 解碼與裝飾器
- 所有路由都需要 JWT 驗證（與 Node.js 後端共用 JWT_SECRET）
- 使用服務層 (services) 處理業務邏輯

JWT 驗證流程：
1. 從 Authorization header 取得 Bearer token
2. 使用 JWT_SECRET 解碼 token
3. 從 payload 取得使用者資訊 (email/username)
4. 將使用者資訊注入 request.user 供路由使用

@module routes
@requires flask
@requires jwt
@requires app
@requires services
@author Rick
@version 1.0.0
"""
import logging
from flask import request, jsonify
import jwt
from functools import wraps
import os

###########################################################
# JWT 驗證工具類
###########################################################
class JWTAuth:
    """
    JWT 驗證工具類
    
    提供 JWT token 的解碼與驗證功能，以及 Flask 路由裝飾器。
    與 Node.js 後端共用相同的 JWT_SECRET 與演算法，確保跨服務驗證一致性。
    
    Attributes:
        secret (str): JWT 簽章密鑰，從環境變數 JWT_SECRET 讀取
        algorithm (str): JWT 演算法，預設為 'HS256'
    
    Methods:
        decode_token: 解碼 JWT token 並回傳 payload
        require_jwt: Flask 路由裝飾器，驗證 JWT 並注入使用者資訊
    """
    def __init__(self, secret=None, algorithm='HS256'):
        """
        初始化 JWT 驗證工具
        
        Args:
            secret (str, optional): JWT 簽章密鑰，預設從環境變數讀取
            algorithm (str, optional): JWT 演算法，預設 'HS256'
        """
        self.secret = secret or os.getenv('JWT_SECRET', 'default_secret')
        self.algorithm = algorithm

    def decode_token(self, token):
        """
        解碼 JWT token
        
        驗證 token 有效性並解碼為 payload 資料。
        
        Args:
            token (str): JWT token 字串
            
        Returns:
            dict: JWT payload 資料（包含使用者資訊）
            
        Raises:
            Exception: Token 已過期或無效
            
        Example:
            >>> payload = jwt_auth.decode_token('eyJhbGc...')
            >>> print(payload['email'])  # 'user@example.com'
        """
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception('Token 已過期')
        except jwt.InvalidTokenError:
            raise Exception('Token 無效')

    def require_jwt(self, f):
        """
        Flask 路由裝飾器：驗證 JWT
        
        檢查 Authorization header 中的 Bearer token，驗證後將使用者資訊
        注入 request.user 供路由函式使用。
        
        Args:
            f (function): 被裝飾的路由函式
            
        Returns:
            function: 包含 JWT 驗證邏輯的裝飾函式
            
        Example:
            @app.route('/protected')
            @jwt_auth.require_jwt
            def protected_route():
                user_email = request.user.get('email')
                return jsonify({'message': f'Hello {user_email}'})
        """
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization', None)
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': '缺少或格式錯誤的 JWT'}), 401
            token = auth_header.split(' ')[1]
            try:
                user = self.decode_token(token)
                request.user = user
            except Exception as e:
                return jsonify({'error': str(e)}), 401
            return f(*args, **kwargs)
        return decorated

# 與 Node.js 後端對齊：使用相同的 JWT 設定
# 預設使用 HS256 演算法，JWT_SECRET 必須與 Node.js 後端相同
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256').upper()
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
jwt_auth = JWTAuth(secret=JWT_SECRET, algorithm=JWT_ALGORITHM)

from google.api_core import exceptions as google_exceptions
# 導入 app 實例與核心物件
from app import app, collection, generation_model
from app.services.chat_memory_service import ChatMemoryService
from app.services.web_search_service import build_web_context

###########################################################
# /chat 路由：JWT 驗證 + 對話記憶 + Gemini RAG
###########################################################
@app.route('/chat', methods=['POST'])
@jwt_auth.require_jwt
def chat():
    """
    聊天機器人對話 API
    
    提供帶對話記憶的智能問答功能，結合 ChromaDB 向量檢索與 Gemini 生成。
    每個使用者的每個 chat_id 都有獨立的對話記憶。
    
    Request:
        Headers:
            Authorization: Bearer <JWT_TOKEN>
        Body (JSON):
            {
                "chat_id": str,    # 對話 ID（用於區分不同對話）
                "message": str     # 使用者訊息
            }
    
    Response (JSON):
        {
            "answer": str,         # AI 回答
            "chat_id": str         # 對話 ID
        }
    
    業務邏輯：
        1. 驗證 JWT 取得使用者身份
        2. 從對話記憶中取得歷史對話（最後 20 筆）
        3. 將歷史對話納入 RAG 檢索上下文
        4. 使用 Gemini 生成回答
        5. 儲存使用者訊息與 AI 回答至對話記憶
    
    Returns:
        tuple: (JSON response, HTTP status code)
    
    Example:
        POST /chat
        Authorization: Bearer eyJhbGc...
        {
            "chat_id": "conv_123",
            "message": "什麼是職業傷害？"
        }
        
        Response:
        {
            "answer": "職業傷害是指...",
            "chat_id": "conv_123"
        }
    """
    data = request.get_json()
    if not data or 'message' not in data or 'chat_id' not in data:
        return jsonify({"error": "請求格式錯誤，需要包含 'message' 和 'chat_id' 欄位"}), 400

    # 從 JWT payload 取得使用者識別
    # Node.js 端 JWT payload 包含: { email, username }
    # 優先順序：user_id > id > email > username
    user_id = (
        request.user.get('user_id')
        or request.user.get('id')
        or request.user.get('email')
        or request.user.get('username')
    )
    if not user_id:
        return jsonify({"error": "JWT payload 缺少有效的使用者識別 (email/username)"}), 401
    
    chat_id = data['chat_id']
    user_query = data['message']
    chat_memory = ChatMemoryService()

    # 取得對話歷史記憶（最後 20 筆，list of dicts）
    history = chat_memory.get_history(user_id, chat_id, limit=20)

    # 將歷史記憶納入 RAG 回答上下文
    history_text = '\n'.join([f"{h['role']}: {h['message']}" for h in history])
    full_context = f"{history_text}\nuser: {user_query}" if history_text else user_query

    # Gemini RAG 回答
    from app.services.rag_service import find_best_passage, generate_answer
    relevant_context = find_best_passage(full_context, collection)
    final_answer = generate_answer(user_query, relevant_context, generation_model)

    # 若 RAG 無明確內容或模型回覆無法回答，嘗試 Google 搜尋後援
    # 檢測回答中是否包含「找不到」、「無法回答」等標記
    fallback_markers = [
        "抱歉，知識庫中找不到相關資料",
        "無法回答這個問題",
    ]
    if any(m in relevant_context for m in fallback_markers) or any(m in (final_answer or "") for m in fallback_markers):
        web_ctx = build_web_context(user_query, top_k=2)
        if web_ctx:
            final_answer = generate_answer(user_query, web_ctx, generation_model)

    # 記錄本次對話至記憶體
    chat_memory.add_message(user_id, chat_id, user_query, role='user')
    chat_memory.add_message(user_id, chat_id, final_answer, role='bot')

    # 回傳結果（包含完整對話歷史）
    # history 採用 JSON 物件格式，方便前端使用
    return jsonify({
        "reply": final_answer,
        "history": history + [
            {"role": "user", "message": user_query},
            {"role": "bot", "message": final_answer}
        ]
    })

###########################################################
# /generate 路由：純 Gemini RAG
###########################################################
@app.route('/generate', methods=['POST'])
def handle_generation():
    """
    純 Gemini RAG 生成 API：
    - body: {"message": str}
    - 回傳：Gemini RAG 回答
    """
    from app.services.rag_service import find_best_passage, generate_answer
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "請求格式錯誤，需要包含 'message' 欄位"}), 400

    user_query = data['message']
    try:
        logging.info(f"收到查詢: {user_query}")
        relevant_context = find_best_passage(user_query, collection)
        logging.info(f"ChromaDB 找到的相關資料: {relevant_context[:80]}...")
        final_answer = generate_answer(user_query, relevant_context, generation_model)
        # 若 RAG 無明確內容或模型回覆無法回答，嘗試 Google 搜尋後援
        fallback_markers = [
            "抱歉，知識庫中找不到相關資料",
            "無法回答這個問題",
        ]
        if any(m in relevant_context for m in fallback_markers) or any(m in (final_answer or "") for m in fallback_markers):
            web_ctx = build_web_context(user_query, top_k=2)
            if web_ctx:
                final_answer = generate_answer(user_query, web_ctx, generation_model)
        logging.info(f"Gemini 回應: {final_answer}")
        return jsonify({"reply": final_answer})
    except google_exceptions.ResourceExhausted as e:
        logging.error(f"Google API 額度已用盡: {e}")
        return jsonify({
            "error": "AI 服務目前請求量過大，請稍後再試。API 免費額度已用盡。"
        }), 429
    except Exception as e:
        logging.error(f"處理 API 請求時發生未預期的錯誤: {e}")
        return jsonify({"error": "處理您的請求時發生內部錯誤"}), 500

