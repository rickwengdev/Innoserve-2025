# Innoserve 前端 API 使用指南

完整的 RESTful API 文件，包含 Node.js 後端與 Python RAG AI 服務。

## 📋 目錄

- [基本資訊](#基本資訊)
- [認證方式](#認證方式)
- [健康檢查 API](#健康檢查-api)
- [使用者 API](#使用者-api)
  - [註冊](#1-註冊新使用者)
  - [登入](#2-使用者登入)
  - [驗證 Token](#3-驗證-token)
  - [取得個人資料](#4-取得個人資料)
  - [更新個人資料](#5-更新個人資料)
  - [修改密碼](#6-修改密碼)
- [申請表 API](#申請表-api)
  - [新增申請](#1-新增申請)
  - [取得我的所有申請列表](#2-取得我的所有申請列表)
  - [取得單筆申請基本資料](#3-取得單筆申請基本資料)
  - [取得完整申請封包](#4-取得完整申請封包)
  - [更新申請](#5-更新申請)
  - [下載申請 PDF](#6-下載申請-pdf)
- [RAG AI 聊天機器人 API](#rag-ai-聊天機器人-api)
  - [純 RAG 問答（無記憶）](#1-純-rag-問答無記憶)
  - [對話聊天（含記憶）](#2-對話聊天含記憶)
- [錯誤處理](#錯誤處理)
- [範例代碼](#範例代碼)
- [申請表欄位對照](#申請表欄位對照)

---

## 基本資訊

### Base URLs

| 服務 | URL | 說明 |
|------|-----|------|
| Node.js Backend | `http://localhost:3000` | 主要 API 服務 |
| Python RAG API | `http://localhost:5001` | AI 問答服務 |

### 內容類型

所有請求的 Content-Type 都應設為：

```text
Content-Type: application/json
```text

### 日期與時間格式

- 日期格式：`YYYY-MM-DD` (例：2025-01-15)
- 時間格式：`HH:mm:ss` (例：14:30:00)
- 時間戳格式：ISO 8601 (例：2025-01-15T14:30:00Z)

---

## 認證方式

### JWT Token 使用方式

部分 API 需要 JWT 認證，請在 HTTP Header 中加入：

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

### 需要認證的 API

- ✅ 所有 `/api/users/profile` 相關
- ✅ 所有 `/api/users/change-password`
- ✅ 所有 `/api/users/verify`
- ✅ 所有 `/api/applications/*`
- ✅ 所有 RAG AI 服務 (`/chat`, `/generate`)

### 不需要認證的 API

- ❌ `/api/users/register`
- ❌ `/api/users/login`

---

## 健康檢查 API

### 服務健康狀態（含資料庫）

**端點**

```text
GET /api/health
```text

**是否需要認證**
❌ 不需要

**成功回應 (200 OK)**

```json
{
  "success": true,
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "ok",
      "responseTimeMs": 12
    }
  },
  "responseTimeMs": 15
}
```text

**失敗回應 (503 Service Unavailable)**

```json
{
  "success": false,
  "status": "degraded",
  "uptime": 123.456,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "error",
      "message": "connect ECONNREFUSED 127.0.0.1:3306"
    }
  }
}
```text

**說明**

- 回傳目前服務啟動時間 (uptime) 與時間戳
- 會檢查資料庫連線是否正常（執行 SELECT 1）
- 任何子服務錯誤會回 503 與 `status: degraded`

---

## 使用者 API

### 1. 註冊新使用者

**端點**

```text
POST /api/users/register
```text

**是否需要認證**
❌ 不需要

**請求 Body**

```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "username": "王小明",
  "DOB": "1990-01-01",
  "ID_number": "A123456789",
  "ZIP_code": "100",
  "useraddress": "台北市中正區重慶南路一段100號",
  "home_telephone": "02-23456789",
  "telephone": "0912-345-678"
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| email | string | ✅ | 使用者電子郵件（唯一） | <user@example.com> |
| password | string | ✅ | 密碼（至少6個字元） | yourpassword |
| username | string | ✅ | 使用者姓名 | 王小明 |
| DOB | string | ⬜ | 出生日期 (YYYY-MM-DD) | 1990-01-01 |
| ID_number | string | ⬜ | 身分證號（唯一） | A123456789 |
| ZIP_code | string | ⬜ | 郵遞區號 | 100 |
| useraddress | string | ⬜ | 地址 | 台北市中正區... |
| home_telephone | string | ⬜ | 住家電話 | 02-23456789 |
| telephone | string | ⬜ | 聯絡電話 | 0912-345-678 |

**成功回應 (201 Created)**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "王小明"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```text

**錯誤回應**

- **409 Conflict** - Email 已存在

  ```json
  {
    "success": false,
    "message": "Email already exists"
  }
  ```

- **400 Bad Request** - 資料驗證失敗

  ```json
  {
    "success": false,
    "message": "錯誤訊息描述"
  }
  ```

---

### 2. 使用者登入

**端點**

```text
POST /api/users/login
```text

**是否需要認證**
❌ 不需要

**請求 Body**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| email | string | ✅ | 使用者電子郵件 |
| password | string | ✅ | 密碼 |

**成功回應 (200 OK)**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "王小明",
    "DOB": "1990-01-01",
    "ID_number": "A123456789",
    "ZIP_code": "100",
    "useraddress": "台北市中正區重慶南路一段100號",
    "home_telephone": "02-23456789",
    "telephone": "0912-345-678",
    "created_at": "2025-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```text

**重要**：請將 `token` 儲存起來（例如：localStorage），後續需要認證的 API 都需要使用此 token。

**錯誤回應**

- **401 Unauthorized** - 帳號或密碼錯誤

  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

- **400 Bad Request** - 缺少必填欄位

  ```json
  {
    "success": false,
    "message": "Email and password are required"
  }
  ```

---

### 3. 驗證 Token

**端點**

```text
GET /api/users/verify
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**成功回應 (200 OK)**

```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "email": "user@example.com"
  }
}
```text

**錯誤回應**

- **401 Unauthorized** - Token 無效或過期

  ```json
  {
    "success": false,
    "message": "Invalid token"
  }
  ```

---

### 4. 取得個人資料

**端點**

```text
GET /api/users/profile
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**成功回應 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "王小明",
    "DOB": "1990-01-01",
    "ID_number": "A123456789",
    "ZIP_code": "100",
    "useraddress": "台北市中正區重慶南路一段100號",
    "home_telephone": "02-23456789",
    "telephone": "0912-345-678",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```text

**錯誤回應**

- **404 Not Found** - 使用者不存在

  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

### 5. 更新個人資料

**端點**

```text
PUT /api/users/profile
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**請求 Body**

```json
{
  "username": "王大明",
  "DOB": "1991-05-20",
  "ID_number": "A987654321",
  "ZIP_code": "110",
  "useraddress": "台北市信義區市府路1號",
  "home_telephone": "02-27208889",
  "telephone": "0987-654-321"
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| username | string | ⬜ | 使用者姓名 |
| DOB | string | ⬜ | 出生日期 (YYYY-MM-DD) |
| ID_number | string | ⬜ | 身分證號 |
| ZIP_code | string | ⬜ | 郵遞區號 |
| useraddress | string | ⬜ | 地址 |
| home_telephone | string | ⬜ | 住家電話 |
| telephone | string | ⬜ | 聯絡電話 |

**注意**：

- 只需要傳送要更新的欄位
- `email` 和 `password` 無法透過此 API 更新
- 更新 `email` 會自動從 token 中取得，不需要在 body 中傳送

**成功回應 (200 OK)**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "王大明",
    "DOB": "1991-05-20",
    "ID_number": "A987654321",
    "ZIP_code": "110",
    "useraddress": "台北市信義區市府路1號",
    "home_telephone": "02-27208889",
    "telephone": "0987-654-321",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```text

---

### 6. 修改密碼

**端點**

```text
PUT /api/users/change-password
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**請求 Body**

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| currentPassword | string | ✅ | 當前密碼 |
| newPassword | string | ✅ | 新密碼（至少6個字元） |

**成功回應 (200 OK)**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```text

**錯誤回應**

- **400 Bad Request** - 缺少必填欄位或新密碼太短

  ```json
  {
    "success": false,
    "message": "New password must be at least 6 characters"
  }
  ```

- **400 Bad Request** - 當前密碼錯誤

  ```json
  {
    "success": false,
    "message": "Current password is incorrect"
  }
  ```

---

## 申請表 API

### 1. 新增申請

**端點**

```text
POST /api/applications
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**請求 Body**

```json
{
  "eligibility_criteria": 1,
  "types_of_wounded": 0,
  "injury_date": "2025-01-10",
  "salary_status": 1,
  "salary_type": 2,
  "is_reinstated": 0,
  "reinstatement_date": null,
  "injury_type": 3,
  "work_content": "操作機台進行零件加工",
  "injury_time": "14:30:00",
  "injury_location": "工廠A區機台3號",
  "injury_cause": "機械設備故障導致手部受傷",
  "chemical_substance_name": "",
  "other_injury_factors": "",
  "public_injury_description": ""
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| eligibility_criteria | number | ⬜ | 請領資格 (0/1/2/3) | 1 |
| types_of_wounded | number | ⬜ | 傷兵類別 (0/1) | 0 |
| injury_date | string | ⬜ | 受傷日期 (YYYY-MM-DD) | 2025-01-10 |
| salary_status | number | ⬜ | 取得薪資情形 (0=連續, 1=斷續) | 1 |
| salary_type | number | ⬜ | 薪資類別 (0/1/2/3) | 2 |
| is_reinstated | number | ⬜ | 是否復工 (0=否, 1=是) | 0 |
| reinstatement_date | string | ⬜ | 復工日期 (YYYY-MM-DD) | null |
| injury_type | number | ⬜ | 傷害類型 (0/1/2/3) | 3 |
| work_content | string | ⬜ | 工作內容描述 | 操作機台... |
| injury_time | string | ⬜ | 受傷時間 (HH:mm:ss) | 14:30:00 |
| injury_location | string | ⬜ | 受傷地點 | 工廠A區... |
| injury_cause | string | ⬜ | 受傷原因描述 | 機械設備故障... |
| chemical_substance_name | string | ⬜ | 化學物質名稱（如有） | |
| other_injury_factors | string | ⬜ | 其他受傷因素描述 | |
| public_injury_description | string | ⬜ | 公出受傷說明（如是公出） | |

**欄位選項說明**

- `eligibility_criteria` 請領資格：0, 1, 2, 3（四個選項）
- `types_of_wounded` 傷兵類別：0, 1（兩個選項）
- `salary_status` 取得薪資情形：0=連續, 1=斷續
- `salary_type` 薪資類別：0, 1, 2, 3（四個選項）
- `is_reinstated` 是否復工：0=否, 1=是
- `injury_type` 傷害類型：0, 1, 2, 3（四個選項）

**注意**：

- `email` 會自動從 JWT token 中取得，不需要在 body 中傳送
- 如果 `is_reinstated` 為 0（未復工），`reinstatement_date` 應為 `null`

**成功回應 (201 Created)**

```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "application_id": 1,
    "email": "user@example.com",
    "eligibility_criteria": 1,
    "types_of_wounded": 0,
    "injury_date": "2025-01-10",
    "salary_status": 1,
    "salary_type": 2,
    "is_reinstated": 0,
    "reinstatement_date": null,
    "injury_type": 3,
    "work_content": "操作機台進行零件加工",
    "injury_time": "14:30:00",
    "injury_location": "工廠A區機台3號",
    "injury_cause": "機械設備故障導致手部受傷",
    "chemical_substance_name": "",
    "other_injury_factors": "",
    "public_injury_description": "",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```text

---

### 2. 取得我的所有申請列表

**端點**

```text
GET /api/applications/my-applications
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**成功回應 (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "application_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "application_id": 2,
      "created_at": "2025-01-14T09:20:00.000Z",
      "updated_at": "2025-01-14T15:45:00.000Z"
    }
  ]
}
```text

**說明**：此 API 僅返回申請 ID 和時間戳，用於顯示申請列表。若需要完整資料，請使用下方的「取得單筆申請」或「取得完整申請封包」API。

---

### 3. 取得單筆申請基本資料

**端點**

```text
GET /api/applications/:id
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**URL 參數**

| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**

```text
GET /api/applications/1
```text

**成功回應 (200 OK)**

```json
{
  "success": true,
  "data": {
    "application_id": 1,
    "email": "user@example.com",
    "eligibility_criteria": 1,
    "types_of_wounded": 0,
    "injury_date": "2025-01-10",
    "salary_status": 1,
    "salary_type": 2,
    "is_reinstated": 0,
    "reinstatement_date": null,
    "injury_type": 3,
    "work_content": "操作機台進行零件加工",
    "injury_time": "14:30:00",
    "injury_location": "工廠A區機台3號",
    "injury_cause": "機械設備故障導致手部受傷",
    "chemical_substance_name": "",
    "other_injury_factors": "",
    "public_injury_description": "",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```text

**錯誤回應**

- **404 Not Found** - 申請不存在

  ```json
  {
    "success": false,
    "message": "Application not found"
  }
  ```

- **403 Forbidden** - 無權訪問此申請（不是申請擁有者）

  ```json
  {
    "success": false,
    "message": "Forbidden: Access denied"
  }
  ```

---

### 4. 取得完整申請封包

**端點**

```text
GET /api/applications/:id/full-details
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**URL 參數**

| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**

```text
GET /api/applications/1/full-details
```text

**成功回應 (200 OK)**

```json
{
  "success": true,
  "data": {
    "application": {
      "application_id": 1,
      "email": "user@example.com",
      "eligibility_criteria": 1,
      "types_of_wounded": 0,
      "injury_date": "2025-01-10",
      "salary_status": 1,
      "salary_type": 2,
      "is_reinstated": 0,
      "reinstatement_date": null,
      "injury_type": 3,
      "work_content": "操作機台進行零件加工",
      "injury_time": "14:30:00",
      "injury_location": "工廠A區機台3號",
      "injury_cause": "機械設備故障導致手部受傷",
      "chemical_substance_name": "",
      "other_injury_factors": "",
      "public_injury_description": "",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "username": "王小明",
      "DOB": "1990-01-01",
      "ID_number": "A123456789",
      "ZIP_code": "100",
      "useraddress": "台北市中正區重慶南路一段100號",
      "home_telephone": "02-23456789",
      "telephone": "0912-345-678",
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    "interruption_periods": [
      {
        "period_id": 1,
        "application_id": 1,
        "start_date": "2025-01-15",
        "end_date": "2025-01-20",
        "created_at": "2025-01-15T10:35:00.000Z",
        "updated_at": "2025-01-15T10:35:00.000Z"
      },
      {
        "period_id": 2,
        "application_id": 1,
        "start_date": "2025-01-25",
        "end_date": "2025-01-28",
        "created_at": "2025-01-15T10:36:00.000Z",
        "updated_at": "2025-01-15T10:36:00.000Z"
      }
    ]
  }
}
```text

**說明**：
此 API 會返回完整的申請資料包，包含：

- `application` - 申請表的所有資料
- `user` - 申請人的個人資料
- `interruption_periods` - 斷續時間記錄（如有）

**錯誤回應**

- **404 Not Found** - 申請不存在

  ```json
  {
    "success": false,
    "message": "Application not found"
  }
  ```

- **403 Forbidden** - 無權訪問此申請

  ```json
  {
    "success": false,
    "message": "Forbidden: Access denied"
  }
  ```

---

### 5. 更新申請

**端點**

```text
PUT /api/applications/:id
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

**URL 參數**

| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**

```text
PUT /api/applications/1
```text

**請求 Body**

```json
{
  "eligibility_criteria": 2,
  "types_of_wounded": 1,
  "injury_date": "2025-01-12",
  "salary_status": 0,
  "salary_type": 1,
  "is_reinstated": 1,
  "reinstatement_date": "2025-02-01",
  "injury_type": 2,
  "work_content": "更新後的工作內容描述",
  "injury_time": "15:45:00",
  "injury_location": "更新後的受傷地點",
  "injury_cause": "更新後的受傷原因",
  "chemical_substance_name": "甲苯",
  "other_injury_factors": "其他因素說明",
  "public_injury_description": "公出說明"
}
```text

**欄位說明**
與「新增申請」相同，所有欄位都是選填的，只需傳送要更新的欄位。

**成功回應 (200 OK)**

```json
{
  "success": true,
  "message": "Application updated successfully",
  "data": {
    "application_id": 1,
    "email": "user@example.com",
    "eligibility_criteria": 2,
    "types_of_wounded": 1,
    "injury_date": "2025-01-12",
    "salary_status": 0,
    "salary_type": 1,
    "is_reinstated": 1,
    "reinstatement_date": "2025-02-01",
    "injury_type": 2,
    "work_content": "更新後的工作內容描述",
    "injury_time": "15:45:00",
    "injury_location": "更新後的受傷地點",
    "injury_cause": "更新後的受傷原因",
    "chemical_substance_name": "甲苯",
    "other_injury_factors": "其他因素說明",
    "public_injury_description": "公出說明",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T16:20:00.000Z"
  }
}
```text

**錯誤回應**

- **404 Not Found** - 申請不存在

  ```json
  {
    "success": false,
    "message": "Application not found"
  }
  ```

- **403 Forbidden** - 無權修改此申請

  ```json
  {
    "success": false,
    "message": "Forbidden: Access denied"
  }
  ```

---

### 6. 下載申請 PDF

將單筆申請資料（含使用者資訊、斷續時間）輸出為 PDF 檔案。

#### 端點

```bash
GET /api/applications/:id/pdf
```text

#### 是否需要認證

需要（Bearer Token）

#### 請求 Headers

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```text

#### URL 參數

| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID（僅能存取自己） | 1 |

#### Query 參數（可選）

| 參數 | 類型 | 說明 | 範例 |
|------|------|------|------|
| download | 0/1 | 1 以附件下載（attachment），預設 inline | 1 |
| filename | string | 建議存檔檔名；自動提供 ASCII 與 UTF-8（filename*） | 申請書_1.pdf |
| receipt | 0/1 | 是否在最後附上收據頁，0 關閉；預設 1 | 0 |

#### 成功回應

- 狀態碼：200 OK
- 內容型別：`application/pdf`
- 內容：PDF 檔案串流（inline）

#### 前端下載範例（Fetch）

```javascript
async function downloadApplicationPdf(id) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('請先登入');

  const res = await fetch(`http://localhost:3000/api/applications/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || '下載失敗');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `application_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```text

可選：以附件下載並指定檔名

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/applications/1/pdf?download=1&filename=%E7%94%B3%E8%AB%8B%E6%9B%B8_1.pdf"
```text

#### 備註

- 伺服器會嘗試使用 `nodejs_app/assets/` 下的模板 PDF（`form_template.pdf` 或 `申請書與收據.pdf`）。
- 若 `assets/fonts/` 內提供 CJK 字型（例如 `NotoSansCJKtc-Regular.otf`），PDF 會正確顯示中文。
- 未提供字型時，為避免編碼錯誤，非 ASCII 字元會以 `?` 顯示（僅為退場機制）。

---

## RAG AI 聊天機器人 API

RAG（Retrieval-Augmented Generation，檢索增強生成）服務使用 Google Gemini AI 提供智能問答功能。

### 服務說明

| 端點 | 需要認證 | 功能 | 記憶 |
|------|---------|------|------|
| `/generate` | ✅ 需要 | 純 RAG 問答 | ❌ 無記憶 |
| `/chat` | ✅ 需要 | 對話聊天 | ✅ 有記憶 |

### RAG 服務 Base URL

```text
http://localhost:5001
```text

> **注意**：這是 Python RAG 服務的端點，與 Node.js 主服務（port 3000）不同。

---

### 1. 純 RAG 問答（無記憶）

單次問答，不保留對話歷史。適合一次性查詢或無需上下文的問題。

**端點**

```text
POST /generate
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```text

**請求 Body**

```json
{
  "query": "什麼是職業傷害？",
  "use_web_search": false
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 | 預設值 |
|------|------|------|------|--------|
| query | string | ✅ | 使用者問題 | - |
| use_web_search | boolean | ⬜ | 是否啟用網頁搜尋後援 | false |

**成功回應 (200 OK)**

```json
{
  "answer": "職業傷害是指勞工在執行職務過程中，因工作場所的危險因素或工作條件所導致的身體傷害或疾病。根據勞工保險條例，職業傷害包括：\n1. 工作場所發生的意外事故\n2. 執行職務時遭受的傷害\n3. 通勤途中發生的事故..."
}
```text

**錯誤回應**

- **400 Bad Request** - 缺少必填欄位

  ```json
  {
    "error": "請求格式錯誤，需要包含 'query' 欄位"
  }
  ```

- **401 Unauthorized** - JWT Token 無效

  ```json
  {
    "error": "缺少或格式錯誤的 JWT"
  }
  ```

- **429 Too Many Requests** - API 額度用完

  ```json
  {
    "error": "API 使用額度已達上限，請稍後再試"
  }
  ```

**使用範例 (cURL)**

```bash
curl -X POST http://localhost:5001/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "職業傷害的申請流程是什麼？",
    "use_web_search": true
  }'
```text

**使用範例 (JavaScript)**

```javascript
async function askRAG(question) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5001/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: question,
      use_web_search: false
    })
  });
  
  const data = await response.json();
  return data.answer;
}

// 使用
const answer = await askRAG('什麼是職業傷害？');
console.log(answer);
```text

---

### 2. 對話聊天（含記憶）

具備對話記憶的聊天機器人，每個使用者的每個 chat_id 有獨立的對話歷史。

**端點**

```text
POST /chat
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```text

**請求 Body**

```json
{
  "chat_id": "conversation_123",
  "message": "勞工保險和勞退制度差別是什麼？"
}
```text

**欄位說明**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| chat_id | string | ✅ | 對話 ID（用於區分不同對話） |
| message | string | ✅ | 使用者訊息 |

**成功回應 (200 OK)**

```json
{
  "reply": "勞工保險和勞退制度的主要差別如下：\n\n1. 勞工保險（勞保）：\n   - 性質：社會保險制度\n   - 目的：提供生育、傷病、失能、老年、死亡等保障\n   - 給付：包含生育給付、傷病給付、失能給付、老年給付、死亡給付\n\n2. 勞工退休金（勞退）：\n   - 性質：強制儲蓄制度\n   - 目的：專門保障勞工退休後的生活\n   - 給付：退休時一次領取或按月領取退休金\n\n主要差異在於勞保是綜合性的社會保險，而勞退則是專門的退休金制度。",
  "history": [
    {
      "role": "user",
      "message": "什麼是職業傷害？"
    },
    {
      "role": "bot",
      "message": "職業傷害是指..."
    },
    {
      "role": "user",
      "message": "勞工保險和勞退制度差別是什麼？"
    },
    {
      "role": "bot",
      "message": "勞工保險和勞退制度的主要差別如下..."
    }
  ]
}
```text

**回應欄位說明**

| 欄位 | 類型 | 說明 |
|------|------|------|
| reply | string | AI 的回答 |
| history | array | 完整的對話歷史（最後 20 筆） |

**錯誤回應**

- **400 Bad Request** - 缺少必填欄位

  ```json
  {
    "error": "請求格式錯誤，需要包含 'message' 和 'chat_id' 欄位"
  }
  ```

- **401 Unauthorized** - JWT Token 無效

  ```json
  {
    "error": "JWT payload 缺少有效的使用者識別 (email/username)"
  }
  ```

**使用範例 (cURL)**

```bash
curl -X POST http://localhost:5001/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "chat_id": "conversation_123",
    "message": "我想知道職業傷害的補償內容"
  }'
```text

**使用範例 (JavaScript)**

```javascript
async function chatWithRAG(chatId, message) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5001/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      chat_id: chatId,
      message: message
    })
  });
  
  const data = await response.json();
  return data;
}

// 使用
const result = await chatWithRAG('chat_001', '什麼是職業傷害？');
console.log('AI 回答:', result.reply);
console.log('對話歷史:', result.history);

// 繼續對話（使用相同的 chat_id）
const result2 = await chatWithRAG('chat_001', '申請流程是什麼？');
// AI 會記得之前的對話內容
```text

**對話記憶說明**

- 每個使用者的每個 `chat_id` 都有獨立的對話記憶
- 對話歷史儲存在服務器端（檔案系統）
- 每次對話最多返回最後 20 筆歷史記錄
- 使用不同的 `chat_id` 可以建立多個獨立的對話
- 記憶會自動包含在 RAG 檢索的上下文中，提供更準確的回答

**最佳實踐**

```javascript
// 為不同的對話主題使用不同的 chat_id
const generalChat = 'general_' + Date.now();
const applicationChat = 'application_' + userId;

// 一般諮詢
await chatWithRAG(generalChat, '勞保的給付項目有哪些？');

// 申請相關（使用不同的 chat_id）
await chatWithRAG(applicationChat, '我的申請進度如何？');
```text

---
{
  "reply": "勞工退休金是...（模型生成的文字）"
}

```text

**可能的錯誤**
- 400 Bad Request：缺少 `message`
- 429 Too Many Requests：AI/搜尋服務額度暫時不足
- 500 Internal Server Error：內部錯誤

**Curl 範例**
```bash
curl -X POST http://localhost:5001/generate \
  -H 'Content-Type: application/json' \
  -d '{"message":"什麼是勞工退休金？"}'
```text

### 2. 對話（具記憶，需 JWT）

此端點會：

- 從 JWT 解析使用者（email/username 皆可）
- 依 `chat_id` 讀寫該對話的歷史記憶（JSON 儲存）
- 使用內部知識庫（RAG）回覆；若無資料，會自動進行 Google 搜尋後援再生成回答

**端點**

```text
POST /chat
```text

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**

```text
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```text

**請求 Body**

```json
{
  "chat_id": "chat-abc",
  "message": "勞工保險和勞退制度差別是什麼？"
}
```text

**成功回應 (200 OK)**

```json
{
  "reply": "兩者差異在於...（模型生成的文字）",
  "history": [
    { "role": "user", "message": "上一輪提問..." },
    { "role": "bot",  "message": "上一輪回答..." },
    { "role": "user", "message": "勞工保險和勞退制度差別是什麼？" },
    { "role": "bot",  "message": "兩者差異在於..." }
  ]
}
```text

**可能的錯誤**

- 400 Bad Request：缺少 `chat_id` 或 `message`
- 401 Unauthorized：缺少或無效 JWT；或 JWT payload 未包含可識別的使用者（email/username）
- 500 Internal Server Error：內部錯誤

**Curl 範例**

```bash
TOKEN="<YOUR_JWT_TOKEN>"
curl -X POST http://localhost:5001/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"chat_id":"chat-abc","message":"勞工保險和勞退制度差別是什麼？"}'
```text

> 備註：
>
> - 記憶以檔案方式儲存於 RAG 服務（每位使用者、每個 chat_id 一份 JSON）。
> - JWT 祕鑰與演算法（預設 HS256）需與 Node.js 一致。
> - 服務會優先使用知識庫（ChromaDB + 向量檢索）。若內容不足，會以 Google Custom Search 作為後援並再生成回覆。

---

## 錯誤處理

### HTTP 狀態碼說明

| 狀態碼 | 說明 |
|--------|------|
| 200 | 請求成功 |
| 201 | 資源創建成功 |
| 400 | 請求錯誤（參數錯誤、驗證失敗等） |
| 401 | 未授權（Token 無效或未提供） |
| 403 | 禁止訪問（無權限） |
| 404 | 資源不存在 |
| 409 | 衝突（例如：Email 已存在） |
| 500 | 伺服器錯誤 |

### 錯誤回應格式

所有錯誤都會返回統一格式：

```json
{
  "success": false,
  "message": "錯誤訊息描述"
}
```text

### 常見錯誤處理

#### 1. Token 過期或無效

```javascript
// 前端收到 401 錯誤時，應該：
if (response.status === 401) {
  // 清除本地 token
  localStorage.removeItem('token');
  // 導向登入頁面
  window.location.href = '/login';
}
```text

#### 2. 網路錯誤

```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '請求失敗');
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  // 顯示錯誤訊息給使用者
}
```text

---

## 範例代碼

### JavaScript (Fetch API)

#### 1. 註冊使用者

```javascript
async function register(userData) {
  try {
    const response = await fetch('http://localhost:3000/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    console.log('註冊成功:', data);
    return data;
  } catch (error) {
    console.error('註冊失敗:', error.message);
    throw error;
  }
}

// 使用範例
const newUser = {
  email: "test@example.com",
  password: "password123",
  username: "測試用戶",
  DOB: "1990-01-01",
  telephone: "0912345678"
};

register(newUser);
```text

#### 2. 登入

```javascript
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
  // 儲存 token（扁平化回應：token 在頂層）
  localStorage.setItem('token', data.token);
    console.log('登入成功:', data);
    return data;
  } catch (error) {
    console.error('登入失敗:', error.message);
    throw error;
  }
}

// 使用範例
login('test@example.com', 'password123');
```text

#### 3. 取得個人資料（需要認證）

```javascript
async function getProfile() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('請先登入');
    }
    
    const response = await fetch('http://localhost:3000/api/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    console.log('個人資料:', data);
    return data;
  } catch (error) {
    console.error('取得資料失敗:', error.message);
    throw error;
  }
}

// 使用範例
getProfile();
```text

#### 4. 新增申請（需要認證）

```javascript
async function createApplication(applicationData) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('請先登入');
    }
    
    const response = await fetch('http://localhost:3000/api/applications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    console.log('申請建立成功:', data);
    return data;
  } catch (error) {
    console.error('建立申請失敗:', error.message);
    throw error;
  }
}

// 使用範例
const application = {
  eligibility_criteria: 1,
  types_of_wounded: 0,
  injury_date: "2025-01-10",
  salary_status: 1,
  salary_type: 2,
  is_reinstated: 0,
  reinstatement_date: null,
  injury_type: 3,
  work_content: "操作機台進行零件加工",
  injury_time: "14:30:00",
  injury_location: "工廠A區機台3號",
  injury_cause: "機械設備故障導致手部受傷"
};

createApplication(application);
```text

#### 5. 取得申請列表

```javascript
async function getMyApplications() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('請先登入');
    }
    
    const response = await fetch('http://localhost:3000/api/applications/my-applications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    console.log('我的申請列表:', data);
    return data;
  } catch (error) {
    console.error('取得列表失敗:', error.message);
    throw error;
  }
}

// 使用範例
getMyApplications();
```text

#### 6. 取得完整申請封包

```javascript
async function getApplicationFullDetails(applicationId) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('請先登入');
    }
    
    const response = await fetch(
      `http://localhost:3000/api/applications/${applicationId}/full-details`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    console.log('完整申請資料:', data);
    return data;
  } catch (error) {
    console.error('取得完整資料失敗:', error.message);
    throw error;
  }
}

// 使用範例
getApplicationFullDetails(1);
```text

---

### React Hooks 範例

#### API Service (api.js)

```javascript
const API_BASE_URL = 'http://localhost:3000';

// 通用請求函數
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token && !options.skipAuth) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '請求失敗');
  }
  
  return data;
}

// 使用者 API
export const userApi = {
  register: (userData) => 
    apiRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      skipAuth: true,
    }),
  
  login: (email, password) => 
    apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),
  
  getProfile: () => 
    apiRequest('/api/users/profile'),
  
  updateProfile: (userData) => 
    apiRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  
  changePassword: (currentPassword, newPassword) => 
    apiRequest('/api/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  
  verifyToken: () => 
    apiRequest('/api/users/verify'),
};

// 申請 API
export const applicationApi = {
  create: (applicationData) => 
    apiRequest('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    }),
  
  getMyApplications: () => 
    apiRequest('/api/applications/my-applications'),
  
  getById: (id) => 
    apiRequest(`/api/applications/${id}`),
  
  getFullDetails: (id) => 
    apiRequest(`/api/applications/${id}/full-details`),
  
  update: (id, applicationData) => 
    apiRequest(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(applicationData),
    }),
};
```text

#### 使用 Hook (useAuth.js)

```javascript
import { useState, useEffect } from 'react';
import { userApi } from './api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await userApi.verifyToken();
      if (response.success) {
        const profileResponse = await userApi.getProfile();
        setUser(profileResponse.data);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (email, password) => {
    try {
      setError(null);
  const response = await userApi.login(email, password);
  localStorage.setItem('token', response.token);
  setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  const register = async (userData) => {
    try {
      setError(null);
      const response = await userApi.register(userData);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    checkAuth,
  };
}
```text

#### React 組件範例

```javascript
import React, { useState } from 'react';
import { useAuth } from './useAuth';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // 登入成功，導向首頁
      window.location.href = '/dashboard';
    } catch (err) {
      // 錯誤訊息已經在 useAuth 中處理
      console.error('Login failed:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密碼"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">登入</button>
    </form>
  );
}
```text

---

### Axios 範例

如果你使用 Axios，可以這樣設定：

```javascript
import axios from 'axios';

// 創建 axios 實例
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器：自動添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器：統一處理錯誤
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token 無效，清除並導向登入頁
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// 使用範例
export const userApi = {
  register: (userData) => api.post('/api/users/register', userData),
  login: (email, password) => api.post('/api/users/login', { email, password }),
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (userData) => api.put('/api/users/profile', userData),
  changePassword: (currentPassword, newPassword) => 
    api.put('/api/users/change-password', { currentPassword, newPassword }),
};

export const applicationApi = {
  create: (data) => api.post('/api/applications', data),
  getMyApplications: () => api.get('/api/applications/my-applications'),
  getById: (id) => api.get(`/api/applications/${id}`),
  getFullDetails: (id) => api.get(`/api/applications/${id}/full-details`),
  update: (id, data) => api.put(`/api/applications/${id}`, data),
};
```text

---

## 附錄

### A. 資料欄位代碼對照表

#### 請領資格 (eligibility_criteria)

- `0` - 選項1
- `1` - 選項2
- `2` - 選項3
- `3` - 選項4

#### 傷兵類別 (types_of_wounded)

- `0` - 選項1
- `1` - 選項2

#### 取得薪資情形 (salary_status)

- `0` - 連續
- `1` - 斷續

#### 薪資類別 (salary_type)

- `0` - 選項1
- `1` - 選項2
- `2` - 選項3
- `3` - 選項4

#### 是否復工 (is_reinstated)

- `0` - 否
- `1` - 是

#### 傷害類型 (injury_type)

- `0` - 選項1
- `1` - 選項2
- `2` - 選項3
- `3` - 選項4

### B. 測試用資料

#### 測試用使用者

```json
{
  "email": "test@example.com",
  "password": "test123456",
  "username": "測試用戶",
  "DOB": "1990-01-01",
  "ID_number": "A123456789",
  "ZIP_code": "100",
  "useraddress": "台北市中正區測試路100號",
  "home_telephone": "02-12345678",
  "telephone": "0912-345-678"
}
```text

#### 測試用申請

```json
{
  "eligibility_criteria": 1,
  "types_of_wounded": 0,
  "injury_date": "2025-01-10",
  "salary_status": 1,
  "salary_type": 2,
  "is_reinstated": 0,
  "reinstatement_date": null,
  "injury_type": 3,
  "work_content": "測試工作內容",
  "injury_time": "14:30:00",
  "injury_location": "測試地點",
  "injury_cause": "測試受傷原因",
  "chemical_substance_name": "",
  "other_injury_factors": "",
  "public_injury_description": ""
}
```text

---

## 🎯 總結

本 API 指南涵蓋了 Innoserve 專案的所有後端服務：

### ✅ 已包含功能

- **使用者管理**：完整的註冊、登入、個人資料管理系統
- **申請表管理**：CRUD 操作與 PDF 文件生成
- **AI 問答系統**：RAG 技術驅動的智能聊天機器人（含對話記憶）
- **JWT 認證**：安全的 Token 驗證機制

### 🚀 快速開始步驟

1. 確認服務已啟動（Node.js:3000 + Python:5001）
2. 註冊帳號並取得 JWT Token
3. 使用 Token 存取需要認證的端點
4. 參考範例代碼進行整合

### 📚 文件結構

- 所有 API 端點都包含完整的請求/回應範例
- 錯誤處理章節提供統一的錯誤處理方式
- 範例代碼涵蓋 JavaScript (Fetch/Axios) 實作
- 附錄提供欄位對照表與測試資料

## 申請表欄位對照

附錄中包含申請表各欄位的對照表與測試 JSON 範例，方便前端欄位對應與測試資料準備。

### 🔐 安全注意事項

- 妥善保管 JWT Token（使用 localStorage 或安全的儲存方式）
- 所有敏感操作都需要 Bearer Token 認證
- Token 過期時請重新登入取得新 Token

### 🐛 常見問題

- **401 錯誤**：檢查 Token 是否有效或是否已過期
- **CORS 問題**：確認後端已正確設定 CORS headers
- **網路錯誤**：確認服務是否正常運行（Docker Compose）

---

## 聯絡資訊

如有任何問題或需要協助，請聯絡開發團隊。

**最後更新日期**: 2025-01-30
