"""
API 路由定義：
1. JWT 驗證工具類
2. /chat 路由：chatbot 記憶與 Gemini RAG
3. /generate 路由：純 Gemini RAG
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
    JWT 驗證工具類，提供解碼與裝飾器。
    """
    def __init__(self, secret=None, algorithm='HS256'):
        self.secret = secret or os.getenv('JWT_SECRET', 'default_secret')
        self.algorithm = algorithm

    def decode_token(self, token):
        """解碼 JWT token，回傳 payload"""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception('Token 已過期')
        except jwt.InvalidTokenError:
            raise Exception('Token 無效')

    def require_jwt(self, f):
        """Flask 路由裝飾器，驗證 JWT"""
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

# 與 Node 對齊：預設 HS256，使用相同 JWT_SECRET
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256').upper()
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
jwt_auth = JWTAuth(secret=JWT_SECRET, algorithm=JWT_ALGORITHM)
from google.api_core import exceptions as google_exceptions
# 導入 app 實例與核心物件
from app import app, collection, generation_model
from app.services.chat_memory_service import ChatMemoryService
from app.services.web_search_service import build_web_context

###########################################################
# /chat 路由：JWT 驗證 + chat 記憶 + Gemini RAG
###########################################################
@app.route('/chat', methods=['POST'])
@jwt_auth.require_jwt
def chat():
    """
    chatbot 對話 API：
    - header: Authorization: Bearer <JWT>
    - body: {"chat_id": str, "message": str}
    - 回傳：Gemini RAG 回答 + chat 記憶
    """
    data = request.get_json()
    if not data or 'message' not in data or 'chat_id' not in data:
        return jsonify({"error": "請求格式錯誤，需要包含 'message' 和 'chat_id' 欄位"}), 400

    # Node 端 JWT payload: { email, username }
    # 以 email -> username 順序作為 user_id（無需帳密，僅 token 即可識別使用者）
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

    # 取得歷史記憶（最後 20 筆，list of dicts）
    history = chat_memory.get_history(user_id, chat_id, limit=20)

    # 將歷史記憶納入 RAG 回答上下文
    history_text = '\n'.join([f"{h['role']}: {h['message']}" for h in history])
    full_context = f"{history_text}\nuser: {user_query}" if history_text else user_query

    # Gemini RAG 回答
    from app.services.rag_service import find_best_passage, generate_answer
    relevant_context = find_best_passage(full_context, collection)
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

    # 記錄本次對話
    chat_memory.add_message(user_id, chat_id, user_query, role='user')
    chat_memory.add_message(user_id, chat_id, final_answer, role='bot')

    # 回傳的 history 採用 JSON 物件格式，方便前端使用
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

