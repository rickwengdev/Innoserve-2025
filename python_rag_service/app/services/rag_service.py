"""
負責 RAG 的核心邏輯：檢索 (Retrieve) 與生成 (Generate)。
"""
# 移除此處對 app 核心的依賴，以打破循環
# from app import collection, generation_model

def find_best_passage(query: str, collection) -> str:
    """
    根據使用者查詢，使用 ChromaDB 找到最相關的文件內容。
    'collection' 物件現在作為參數傳入。
    """
    results = collection.query(query_texts=[query], n_results=1)
    if not results or not results.get('documents') or not results['documents'][0]:
        return "抱歉，知識庫中找不到相關資料。"
    return results['documents'][0][0]

def generate_answer(query: str, context: str, generation_model) -> str:
    """
    結合上下文和查詢，生成最終答案。
    'generation_model' 物件現在作為參數傳入。
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

