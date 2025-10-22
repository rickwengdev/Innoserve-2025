"""
這是應用程式的主啟動檔案。
"""
import logging
# 從 app 核心導入 app 和 scheduler
from app import app, scheduler
# 從知識庫服務導入更新函式
from app.services.knowledge_base_service import update_knowledge_base

if __name__ == '__main__':
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
