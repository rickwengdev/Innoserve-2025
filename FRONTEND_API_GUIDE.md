# Innoserve 前端 API 使用指南

## 📋 目錄
- [基本資訊](#基本資訊)
- [認證方式](#認證方式)
- [使用者 API](#使用者-api)
- [申請表 API](#申請表-api)
- [錯誤處理](#錯誤處理)
- [範例代碼](#範例代碼)
 - [健康檢查](#健康檢查)

---

## 基本資訊

### Base URL
```
http://localhost:3000
```

### 內容類型
所有請求的 Content-Type 都應設為：
```
Content-Type: application/json
```

### 日期與時間格式
- 日期格式：`YYYY-MM-DD` (例：2025-01-15)
- 時間格式：`HH:mm:ss` (例：14:30:00)
- 時間戳格式：ISO 8601 (例：2025-01-15T14:30:00Z)

---

## 認證方式

### JWT Token 使用方式
部分 API 需要 JWT 認證，請在 HTTP Header 中加入：
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### 需要認證的 API
- ✅ 所有 `/api/users/profile` 相關
- ✅ 所有 `/api/users/change-password` 
- ✅ 所有 `/api/users/verify`
- ✅ 所有 `/api/applications/*` 

### 不需要認證的 API
- ❌ `/api/users/register`
- ❌ `/api/users/login`

---

## 健康檢查

### 服務健康狀態（含資料庫）

**端點**
```
GET /api/health
```

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
```

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
```

**說明**
- 回傳目前服務啟動時間 (uptime) 與時間戳
- 會檢查資料庫連線是否正常（執行 SELECT 1）
- 任何子服務錯誤會回 503 與 `status: degraded`

---

## 使用者 API

### 1. 註冊新使用者

**端點**
```
POST /api/users/register
```

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
```

**欄位說明**
| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| email | string | ✅ | 使用者電子郵件（唯一） | user@example.com |
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
```

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
```
POST /api/users/login
```

**是否需要認證**
❌ 不需要

**請求 Body**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

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
  "data": {
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
}
```

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
```
GET /api/users/verify
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**成功回應 (200 OK)**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "email": "user@example.com"
  }
}
```

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
```
GET /api/users/profile
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

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
```

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
```
PUT /api/users/profile
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

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
```

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
```

---

### 6. 修改密碼

**端點**
```
PUT /api/users/change-password
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**請求 Body**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

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
```

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
```
POST /api/applications
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

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
```

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
```

---

### 2. 取得我的所有申請列表

**端點**
```
GET /api/applications/my-applications
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

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
```

**說明**：此 API 僅返回申請 ID 和時間戳，用於顯示申請列表。若需要完整資料，請使用下方的「取得單筆申請」或「取得完整申請封包」API。

---

### 3. 取得單筆申請基本資料

**端點**
```
GET /api/applications/:id
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**URL 參數**
| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**
```
GET /api/applications/1
```

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
```

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
```
GET /api/applications/:id/full-details
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**URL 參數**
| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**
```
GET /api/applications/1/full-details
```

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
```

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
```
PUT /api/applications/:id
```

**是否需要認證**
✅ 需要 (Bearer Token)

**請求 Headers**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**URL 參數**
| 參數 | 說明 | 範例 |
|------|------|------|
| id | 申請 ID | 1 |

**範例請求**
```
PUT /api/applications/1
```

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
```

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
```

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
```

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
```

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
```

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
```

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
    
    // 儲存 token
    localStorage.setItem('token', data.data.token);
    console.log('登入成功:', data);
    return data;
  } catch (error) {
    console.error('登入失敗:', error.message);
    throw error;
  }
}

// 使用範例
login('test@example.com', 'password123');
```

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
```

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
```

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
```

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
```

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
```

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
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
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
```

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
```

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
```

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
```

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
```

---

## 聯絡資訊

如有任何問題或需要協助，請聯絡開發團隊。

**最後更新日期**: 2025-01-15
