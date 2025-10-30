"""
應用程式主啟動檔案

負責啟動 Flask 應用與背景排程器，並執行知識庫初始化。

主要流程：
1. 註冊定時任務（每日凌晨 3:00 更新知識庫）
2. 服務啟動時立即執行一次知識庫初始化
3. 啟動背景排程器
4. 啟動 Flask HTTP 伺服器 (port 5001)

@module run
@requires app
@requires app.services.knowledge_base_service
@author Rick
@version 1.0.0
"""
import logging
# 從 app 核心導入 app 和 scheduler
from app import app, scheduler
# 從知識庫服務導入更新函式
from app.services.knowledge_base_service import update_knowledge_base

if __name__ == '__main__':
    """
    主程式進入點
    
    執行步驟：
    1. 註冊排程任務：每日凌晨 3:00 自動更新知識庫
    2. 立即執行知識庫初始化（確保服務啟動時就有可用資料）
    3. 啟動背景排程器
    4. 啟動 Flask HTTP 伺服器
    
    伺服器配置：
    - Host: 0.0.0.0 (允許外部存取)
    - Port: 5001
    - Debug: False (生產環境模式)
    """
    # 新增排程任務：每日凌晨 3:00 執行知識庫更新
    scheduler.add_job(update_knowledge_base, 'cron', hour=3, minute=0)
    
    logging.info("服務啟動，立即執行一次知識庫初始化...")
    # 服務啟動時，立即執行一次更新
    update_knowledge_base()
    
    # 啟動排程器
    scheduler.start()
    logging.info("排程器已啟動，將於每日凌晨 3:00 更新知識庫。")

    # 啟動 Flask 伺服器
    app.run(host='0.0.0.0', port=5001, debug=False)
