"""
對話記憶服務模組

提供對話歷史記憶的存取與管理功能，支援多使用者、多對話的獨立記憶。

核心功能：
1. 儲存對話歷史（使用者訊息與 AI 回答）
2. 讀取對話歷史（支援分頁限制）
3. 資料標準化（支援多種輸入格式）

儲存機制：
- 檔案系統儲存（JSON 格式）
- 檔案命名：{user_id}_{chat_id}.json
- 預設路徑：python_rag_service/memory/

資料格式：
[
    {"role": "user", "message": "問題內容"},
    {"role": "assistant", "message": "AI 回答"}
]

架構說明：
使用簡單的檔案系統儲存，避免額外的資料庫依賴。
適合中小型應用，若需要高效能可考慮改用 Redis 或資料庫。

@module services.chat_memory_service
@author Rick
@version 1.0.0
"""

import os
import json
from typing import List, Tuple

# 預設記憶體儲存目錄
MEMORY_DIR = os.path.join(os.path.dirname(__file__), '../../memory')

class ChatMemoryService:
    """
    對話記憶服務類別
    
    管理使用者的對話歷史記憶，提供新增與讀取功能。
    每個使用者的每個對話都有獨立的 JSON 檔案。
    
    Attributes:
        memory_dir (str): 記憶檔案儲存目錄的絕對路徑
    
    Methods:
        add_message: 新增一筆對話記錄
        get_history: 讀取對話歷史（可限制筆數）
    
    檔案命名規則：
        {user_id}_{chat_id}.json
        
    Example:
        >>> memory = ChatMemoryService()
        >>> memory.add_message('user123', 'chat456', '你好', role='user')
        >>> memory.add_message('user123', 'chat456', '您好！有什麼可以幫助您的嗎？', role='assistant')
        >>> history = memory.get_history('user123', 'chat456')
        >>> print(history)
        [
            {"role": "user", "message": "你好"},
            {"role": "assistant", "message": "您好！有什麼可以幫助您的嗎？"}
        ]
    """
    def __init__(self, memory_dir=MEMORY_DIR):
        """
        初始化對話記憶服務
        
        Args:
            memory_dir (str, optional): 記憶檔案儲存目錄，預設使用 MEMORY_DIR
        
        Side Effects:
            若目錄不存在，會自動建立
        """
        self.memory_dir = os.path.abspath(memory_dir)
        if not os.path.exists(self.memory_dir):
            os.makedirs(self.memory_dir)

    def _get_file_path(self, user_id: str, chat_id: str) -> str:
        """
        取得對話記憶檔案的完整路徑
        
        私有方法，用於生成對話記憶檔案的路徑。
        
        Args:
            user_id (str): 使用者 ID（通常是 email）
            chat_id (str): 對話 ID
            
        Returns:
            str: JSON 檔案的完整絕對路徑
            
        Example:
            >>> service._get_file_path('user@example.com', 'conv_123')
            '/path/to/memory/user@example.com_conv_123.json'
        """
        return os.path.join(self.memory_dir, f"{user_id}_{chat_id}.json")

    def _normalize_history(self, history_raw):
        """
        將歷史資料標準化為統一格式
        
        支援多種輸入格式的轉換，確保資料一致性。
        
        Args:
            history_raw (list): 原始歷史資料，可能是：
                - list of dicts: [{"role": str, "message": str}, ...]
                - list of tuples/lists: [[role, message], ...]
        
        Returns:
            list: 標準化後的歷史資料 [{"role": str, "message": str}, ...]
        
        Note:
            - 若資料格式不符，該筆記錄會被忽略
            - 確保向下相容性
        
        Example:
            >>> service._normalize_history([["user", "你好"], ["bot", "您好"]])
            [{"role": "user", "message": "你好"}, {"role": "bot", "message": "您好"}]
        """
        norm = []
        for item in history_raw or []:
            if isinstance(item, dict) and 'role' in item and 'message' in item:
                # 已經是標準格式
                norm.append({"role": item["role"], "message": item["message"]})
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                # 舊格式：[role, message]
                norm.append({"role": str(item[0]), "message": str(item[1])})
        return norm

    def add_message(self, user_id: str, chat_id: str, message: str, role: str):
        """
        新增一筆對話記錄
        
        將新的對話訊息附加到對應的對話歷史檔案中。
        若檔案不存在，會自動建立新檔案。
        
        Args:
            user_id (str): 使用者 ID（通常是 email）
            chat_id (str): 對話 ID
            message (str): 訊息內容
            role (str): 角色類型，通常是 'user' 或 'assistant'（或 'bot'）
        
        Side Effects:
            - 讀取現有的對話歷史檔案（若存在）
            - 附加新訊息
            - 寫回 JSON 檔案
        
        錯誤處理:
            - 若讀取檔案失敗（格式錯誤），會重新建立檔案
            - 確保資料不會因為單次錯誤而遺失
        
        Example:
            >>> service.add_message('user@example.com', 'conv_123', '你好', 'user')
            >>> service.add_message('user@example.com', 'conv_123', '您好！', 'assistant')
        """
        file_path = self._get_file_path(user_id, chat_id)
        # 讀取原始歷史（若不存在則為空陣列）
        raw = []
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw = json.load(f)
            except Exception:
                # 若檔案損壞，重新開始
                raw = []
        
        # 標準化並附加新訊息
        history = self._normalize_history(raw)
        history.append({"role": role, "message": message})
        
        # 寫回檔案（使用 UTF-8 編碼，縮排 2 格便於人工閱讀）
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def get_history(self, user_id: str, chat_id: str, limit: int = 20) -> List[dict]:
        """
        讀取對話歷史記錄
        
        取得指定使用者與對話的歷史訊息，支援限制筆數。
        
        Args:
            user_id (str): 使用者 ID（通常是 email）
            chat_id (str): 對話 ID
            limit (int, optional): 最多回傳幾筆記錄，預設 20（取最後 20 筆）
        
        Returns:
            list: 對話歷史清單，格式為 [{"role": str, "message": str}, ...]
                  若檔案不存在，回傳空清單 []
        
        Note:
            - 回傳的記錄由舊到新排序
            - 若 limit=20，會取最後（最新）20 筆記錄
            - 若總筆數少於 limit，回傳全部記錄
        
        Example:
            >>> history = service.get_history('user@example.com', 'conv_123', limit=10)
            >>> for msg in history:
            ...     print(f"{msg['role']}: {msg['message']}")
            user: 你好
            assistant: 您好！
            user: 什麼是職業傷害？
            assistant: 職業傷害是指...
        """
        file_path = self._get_file_path(user_id, chat_id)
        if not os.path.exists(file_path):
            return []
        
        # 讀取並標準化歷史資料
        with open(file_path, 'r', encoding='utf-8') as f:
            raw = json.load(f)
        normalized = self._normalize_history(raw)
        
        # 只取最後 limit 筆，保持順序由舊到新
        return normalized[-limit:]
