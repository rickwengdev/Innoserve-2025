"""
定義所有 API 端點及其對應的處理邏輯。
"""
import logging
from flask import request, jsonify
from google.api_core import exceptions as google_exceptions

# 從 app 核心導入 app 實例以及我們需要的核心物件
from app import app, collection, generation_model

@app.route('/generate', methods=['POST'])
def handle_generation():
    """處理生成請求的 API 端點"""
    # 導入服務層的函式
    from app.services.rag_service import find_best_passage, generate_answer

    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "請求格式錯誤，需要包含 'message' 欄位"}), 400

    user_query = data['message']
    
    try:
        logging.info(f"收到查詢: {user_query}")
        # 將核心物件 collection 作為參數傳遞給服務函式
        relevant_context = find_best_passage(user_query, collection)
        logging.info(f"ChromaDB 找到的相關資料: {relevant_context[:80]}...")

        # 將核心物件 generation_model 作為參數傳遞給服務函式
        final_answer = generate_answer(user_query, relevant_context, generation_model)
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

