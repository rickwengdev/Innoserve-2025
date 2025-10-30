# Innoserve - 職業傷害申請系統

一個整合 AI 智能客服的職業傷害申請管理系統，使用 Node.js 後端 + Python RAG 服務架構。

## 🏗️ 系統架構

```text
                    ┌─────────────────────────────────┐
                    │         前端使用者介面            │
                    │   (Web / Mobile Application)    │
                    └─────────────────────────────────┘
                              │          │
                   ┌──────────┘          └──────────┐
                   ↓                                ↓
    ┌────────────────────────────┐    ┌────────────────────────────┐
    │   Node.js Backend API      │    │   Python RAG AI Service    │
    │      (Port 3000)           │    │       (Port 5001)          │
    │ ────────────────────────── │    │ ────────────────────────── │
    │  • Express REST API        │    │  • Gemini AI 問答          │
    │  • JWT 身份驗證            │    │  • ChromaDB 向量資料庫     │
    │  • 使用者管理 (CRUD)       │    │  • 對話記憶管理            │
    │  • 申請案件管理 (CRUD)     │    │  • Google 搜尋後援         │
    │  • PDF 文件生成            │    │  • 知識庫自動更新          │
    └────────────────────────────┘    └────────────────────────────┘
                   │                                │
                   ↓                                ↓
    ┌────────────────────────────┐    ┌────────────────────────────┐
    │    MariaDB Database        │    │   ChromaDB Vector Store    │
    │      (Port 3306)           │    │      (Embedded)            │
    │ ────────────────────────── │    │ ────────────────────────── │
    │  • users 使用者資料表      │    │  • 政府法規向量索引        │
    │  • applications 申請表     │    │  • 勞保相關文件向量        │
    │  • interruption_periods    │    │  • 對話記憶 (檔案系統)     │
    │    斷續工作期間            │    │                            │
    └────────────────────────────┘    └────────────────────────────┘
```

📌 架構說明：
• 前端直接呼叫兩個獨立的後端服務
• Node.js 處理業務邏輯與資料持久化
• Python RAG 專注於 AI 問答與知識檢索
• 兩個服務之間無直接互動，各自獨立運作

## 🚀 快速開始

### 1️⃣ 環境需求

- Docker & Docker Compose
- Node.js 18+ (本地開發用)
- Python 3.10+ (本地開發用)

### 2️⃣ 設定環境變數

```bash
# 複製環境變數範例檔案
cp .env.example .env

# 編輯 .env 檔案，填入您的實際值
nano .env
```

**必要設定項目：**

- `GEMINI_API_KEY`: Google Gemini API 金鑰
  - 取得方式：<https://makersuite.google.com/app/apikey>
- `JWT_SECRET`: JWT 簽章密鑰（建議 32 字元以上）
- `MYSQL_ROOT_PASSWORD`: MariaDB root 密碼
- `GOOGLE_CSE_ID`: Google 自訂搜尋引擎 ID（選用）
  - 取得方式：<https://programmablesearchengine.google.com/>
- `GOOGLE_SEARCH_API_KEY`: Google Search API 金鑰（選用）

### 3️⃣ 啟動服務

```bash
# 使用 Docker Compose 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 4️⃣ 驗證服務

- **Node.js Backend**: <http://localhost:3000>
- **Python RAG API**: <http://localhost:5001>
- **MariaDB**: localhost:3306

```bash
# 測試 Node.js API
curl http://localhost:3000/api/health

# 測試 Python RAG API（需要 JWT）
curl -X POST http://localhost:5001/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "什麼是職業傷害？"}'
```

## 📁 專案結構

```text
innoserve/
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 環境變數範例
├── .gitignore                  # Git 忽略清單
│
├── nodejs_app/                 # Node.js 後端
│   ├── app.js                  # Express 應用主檔
│   ├── config/                 # 資料庫配置
│   ├── controllers/            # 控制器層
│   ├── services/               # 服務層（業務邏輯）
│   ├── model/                  # 資料模型層
│   ├── routes/                 # 路由定義
│   ├── middleware/             # 中介層（JWT 驗證）
│   └── assets/                 # 靜態資源（字體、欄位映射）
│
└── python_rag_service/         # Python RAG 服務
    ├── run.py                  # 服務啟動檔
    ├── config.py               # 資料來源配置
    ├── app/
    │   ├── __init__.py         # Flask 應用初始化
    │   ├── routes.py           # API 路由
    │   └── services/           # 服務層
    │       ├── rag_service.py              # RAG 核心
    │       ├── knowledge_base_service.py   # 知識庫管理
    │       ├── scraping_service.py         # 資料抓取
    │       ├── chat_memory_service.py      # 對話記憶
    │       └── web_search_service.py       # 網頁搜尋
    └── memory/                 # 對話記憶儲存
```

## 🔑 API 端點

### Node.js Backend API

#### 使用者相關

- `POST /api/users/register` - 使用者註冊
- `POST /api/users/login` - 使用者登入
- `GET /api/users/profile` - 取得個人資料（需 JWT）
- `PUT /api/users/profile` - 更新個人資料（需 JWT）
- `PUT /api/users/change-password` - 修改密碼（需 JWT）

#### 申請案件相關

- `POST /api/applications` - 建立申請（需 JWT）
- `GET /api/applications/:id` - 取得申請詳情（需 JWT）
- `GET /api/applications/user/all` - 取得使用者所有申請（需 JWT）
- `PUT /api/applications/:id` - 更新申請（需 JWT）
- `GET /api/applications/:id/download-pdf` - 下載申請 PDF（需 JWT）

### Python RAG API

- `POST /chat` - 對話機器人（含記憶，需 JWT）
- `POST /generate` - 純 RAG 問答（無記憶，需 JWT）

## 🛠️ 開發指南

### 本地開發（不使用 Docker）

#### Node.js 後端

```bash
cd nodejs_app
npm install
npm run dev
```

#### Python RAG 服務

```bash
cd python_rag_service
pip install -r requirements.txt
python run.py
```

### 資料庫初始化

資料庫會在首次啟動時自動初始化（透過 `init.sql`）。
若需手動重置：

```bash
# 停止服務
docker-compose down

# 刪除資料庫 volume
docker volume rm innoserve_mariadb_data

# 重新啟動
docker-compose up -d
```

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f app
docker-compose logs -f rag_api
docker-compose logs -f mariadb
```

## 🔒 安全性注意事項

### ⚠️ 請勿提交敏感資訊到 Git

- ✅ `.env` 已加入 `.gitignore`
- ✅ `.env.example` 只包含範例值
- ✅ `docker-compose.yml` 使用環境變數引用

### 🔐 建議的安全措施

1. **JWT_SECRET**: 使用強密碼（32 字元以上）

   ```bash
   # 生成安全的隨機密鑰
   openssl rand -base64 32
   ```

2. **資料庫密碼**: 使用複雜密碼，避免使用預設值

3. **API Keys**: 定期輪換 API 金鑰

4. **生產環境**:
   - 使用 HTTPS
   - 啟用 CORS 限制
   - 設定 rate limiting
   - 使用 secrets management 工具（如 AWS Secrets Manager）

## 📊 知識庫更新

Python RAG 服務會：

- **啟動時立即執行**一次知識庫初始化
- **每日凌晨 3:00** 自動更新知識庫

資料來源（定義在 `python_rag_service/config.py`）：

- 政府開放資料平台
- 勞動部官網
- 勞保局網站
- 全國法規資料庫

## 🧪 測試

```bash
# Node.js 測試
cd nodejs_app
npm test

# Python 測試
cd python_rag_service
pytest
```

## 🐛 故障排除

### 問題 1: 容器無法啟動

```bash
# 檢查日誌
docker-compose logs

# 重建容器
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 問題 2: 資料庫連線失敗

- 確認 `.env` 中的資料庫密碼正確
- 檢查 MariaDB 容器是否正常運行：`docker-compose ps`

### 問題 3: API Key 錯誤

- 確認 `GEMINI_API_KEY` 已正確設定
- 檢查 API 額度是否用完

### 問題 4: bcrypt 編譯錯誤

```bash
# 重新編譯 bcrypt
docker exec nodejs_backend sh -c "cd /usr/src/app && npm rebuild bcrypt"
```

## 👥 貢獻者

- Rick

## 📧 聯絡方式

如有問題或建議，請開 Issue 或 Pull Request。

## 授權 (License)

本專案採用 **GNU Affero General Public License v3.0 (AGPLv3)** 授權。您可以在 [LICENSE](LICENSE) 檔案中查看完整的授權條款。

### 商業授權 (Commercial Licensing)

若您的商業應用無法遵守 AGPLv3 條款（例如：您希望閉源使用本專案作為您 SaaS 服務的一部分，而不想開源您的相關程式碼），請聯繫 `[chain.dev.proton@proton.me]` 洽談商業授權。

---

**注意**: 這是一個用於 Innoserve 比賽的專案，展示了完整的 MVC 架構、RESTful API 設計、RAG 系統整合。
