"""
配置檔案模組
存放所有靜態設定和配置變數

本模組定義 RAG 知識庫的資料來源清單，包含政府開放資料與勞動法規網站。
資料來源類型包含：
- CSV 資料集 (data.gov.tw API)
- HTML 網頁 (政府單位官網、全國法規資料庫)

這些資料來源會被知識庫服務定期抓取並更新至 ChromaDB 向量資料庫。

@module config
@author Innoserve Development Team
@version 1.0.0
"""

# 資料來源 URL 列表
# 包含政府開放資料平台、勞動部官網、勞保局、全國法規資料庫等來源
DATA_SOURCES_URLS = [
    # 政府資料開放平臺
    "https://data.gov.tw/dataset/6061",
    "https://data.gov.tw/dataset/48740",
    "https://data.gov.tw/dataset/45748",
    "https://data.gov.tw/dataset/54765",
    "https://data.gov.tw/dataset/41471",
    "https://data.gov.tw/dataset/34048",
    # 勞動部
    "https://www.mol.gov.tw/1607/28162/28166/28284/48173/33611/",
    "https://www.mol.gov.tw/1607/28162/28166/28284/48173/33613/",
    # 勞動部勞工保險局
    "https://www.bli.gov.tw/0100637.html",
    # 全國法規資料庫
    "https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=N0030018"
]
