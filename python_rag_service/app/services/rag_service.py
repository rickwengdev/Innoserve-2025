"""
RAG 核心服務模組

負責 RAG (Retrieval-Augmented Generation) 的核心邏輯：
1. Retrieve: 從 ChromaDB 向量資料庫檢索相關文件
2. Generate: 使用 Gemini 模型生成回答

架構說明：
此模組實作無狀態的純函式，避免循環依賴問題。
核心物件 (collection, generation_model) 透過參數傳入。

@module services.rag_service
@author Innoserve Development Team
@version 1.0.0
"""

def find_best_passage(query: str, collection) -> str:
    """
    根據使用者查詢，從 ChromaDB 檢索最相關的文件內容
    
    使用向量相似度搜尋找出知識庫中與查詢最相關的段落。
    
    Args:
        query (str): 使用者查詢文字
        collection: ChromaDB collection 物件（包含 embedding_function）
        
    Returns:
        str: 最相關的文件內容，若無相關資料則回傳提示訊息
        
    Note:
        - 使用 query_texts 參數進行向量檢索
        - n_results=1 表示只取最相關的一筆結果
        - collection 物件由呼叫者（routes.py）傳入，避免循環 import
        
    Example:
        >>> passage = find_best_passage("職業傷害申請流程", collection)
        >>> print(passage[:50])  # '勞工保險條例第 34 條規定...'
    """
    results = collection.query(query_texts=[query], n_results=1)
    if not results or not results.get('documents') or not results['documents'][0]:
        return "抱歉，知識庫中找不到相關資料。"
    return results['documents'][0][0]

def generate_answer(query: str, context: str, generation_model) -> str:
    """
    結合上下文和查詢，使用 Gemini 生成最終回答
    
    使用檢索到的上下文資訊，透過 Gemini 模型生成自然語言回答。
    
    Args:
        query (str): 使用者原始問題
        context (str): 檢索到的參考資料（來自 find_best_passage 或網頁搜尋）
        generation_model: Gemini GenerativeModel 物件
        
    Returns:
        str: Gemini 生成的回答文字
        
    Note:
        - Prompt 設計：明確要求基於參考資料回答
        - 若參考資料無法回答，模型會誠實表示「無法回答」
        - generation_model 由呼叫者傳入，避免循環 import
        
    Prompt 策略：
        - 提供清晰的角色定位（基於參考資料回答）
        - 設定回答邊界（若資料不足則坦承無法回答）
        - 使用明確的格式化標記（【參考資料】、【使用者的問題】）
        
    Example:
        >>> answer = generate_answer(
        ...     "什麼是職業傷害？",
        ...     "勞工保險條例第 34 條規定...",
        ...     generation_model
        ... )
        >>> print(answer)  # '職業傷害是指...'
    """
    prompt_template = f"""
    請根據以下提供的【參考資料】來回答【使用者的問題】。
    你的回答應該盡量基於參考資料，如果參考資料無法回答，請回答「根據我所知的資料，我無法回答這個問題」。

    【參考資料】:
    {context}

    【使用者的問題】:
    {query}

    你的回答:
    """
    response = generation_model.generate_content(prompt_template)
    return response.text

