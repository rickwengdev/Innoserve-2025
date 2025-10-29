"""
Chat 記憶存取服務，結構化、易讀、可擴展。
"""

import os
import json
from typing import List, Tuple

MEMORY_DIR = os.path.join(os.path.dirname(__file__), '../../memory')

class ChatMemoryService:
    def __init__(self, memory_dir=MEMORY_DIR):
        self.memory_dir = os.path.abspath(memory_dir)
        if not os.path.exists(self.memory_dir):
            os.makedirs(self.memory_dir)

    def _get_file_path(self, user_id: str, chat_id: str) -> str:
        return os.path.join(self.memory_dir, f"{user_id}_{chat_id}.json")

    def _normalize_history(self, history_raw):
        """
        將歷史資料標準化為列表[ {role, message}, ... ] 格式。
        允許來源是：
          - list of dicts: {"role": str, "message": str}
          - list of 2-item list/tuple: [role, message]
        """
        norm = []
        for item in history_raw or []:
            if isinstance(item, dict) and 'role' in item and 'message' in item:
                norm.append({"role": item["role"], "message": item["message"]})
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                norm.append({"role": str(item[0]), "message": str(item[1])})
        return norm

    def add_message(self, user_id: str, chat_id: str, message: str, role: str):
        file_path = self._get_file_path(user_id, chat_id)
        # 讀取原始歷史（若不存在則為空陣列）
        raw = []
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw = json.load(f)
            except Exception:
                raw = []
        history = self._normalize_history(raw)
        history.append({"role": role, "message": message})
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def get_history(self, user_id: str, chat_id: str, limit: int = 20) -> List[dict]:
        file_path = self._get_file_path(user_id, chat_id)
        if not os.path.exists(file_path):
            return []
        with open(file_path, 'r', encoding='utf-8') as f:
            raw = json.load(f)
        normalized = self._normalize_history(raw)
        # 只取最後 limit 筆，保持順序由舊到新
        return normalized[-limit:]
