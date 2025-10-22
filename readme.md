# Innoserve Application API 說明文件

## 認證方式

- 所有 `/api/applications/*` 需 JWT 驗證，請於 HTTP Header 加上：
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```
- JWT 於 `/api/users/login` 登入時取得。

---

## 使用者 API

### 1. 註冊

- `POST /api/users/register`
- Body (JSON)：
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword",
    "username": "王小明",
    "DOB": "1990-01-01",
    "ID_number": "A123456789",
    "ZIP_code": "100",
    "useraddress": "台北市中正區",
    "home_telephone": "0223456789",
    "telephone": "0912345678"
  }
  ```
- Response：
  ```json
  { "success": true, "message": "User registered successfully", "data": { ... } }
  ```

---

### 2. 登入

- `POST /api/users/login`
- Body (JSON)：
  ```json
  { "email": "user@example.com", "password": "yourpassword" }
  ```
- Response：
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": { ... },
      "token": "<JWT_TOKEN>"
    }
  }
  ```

---

### 3. 更新個人資料

- `PUT /api/users/profile`
- Body (JSON)：
  ```json
  {
    "email": "user@example.com",
    "username": "新名字",
    "DOB": "1991-01-01",
    "ID_number": "A987654321",
    "ZIP_code": "200",
    "useraddress": "新地址",
    "home_telephone": "0223456789",
    "telephone": "0987654321"
  }
  ```
- Response：
  ```json
  { "success": true, "message": "Profile updated successfully", "data": { ... } }
  ```

---

## 申請表 API

### 1. 新增申請

- `POST /api/applications`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Body (JSON)：
  ```json
  {
    "email": "user@example.com",
    "eligibility_criteria": 1,
    "types_of_wounded": 0,
    "injury_date": "2025-01-01",
    "salary_status": 1,
    "salary_type": 2,
    "is_reinstated": 0,
    "reinstatement_date": null,
    "injury_type": 3,
    "work_content": "工作內容描述",
    "injury_time": "08:30:00",
    "injury_location": "工廠A",
    "injury_cause": "機械故障",
    "chemical_substance_name": "",
    "other_injury_factors": "",
    "public_injury_description": ""
  }
  ```
- Response：
  ```json
  { "success": true, "message": "Application created successfully", "data": { "application_id": 1 } }
  ```

---

### 2. 查詢單筆申請

- `GET /api/applications/:id`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Response：
  ```json
  { "success": true, "data": { ...application... } }
  ```

---

### 3. 查詢使用者所有申請

- `GET /api/applications/user/:email`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Response：
  ```json
  { "success": true, "data": [ ...applicationList... ] }
  ```

---

### 4. 更新申請

- `PUT /api/applications/:id`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Body (JSON)：同新增申請
- Response：
  ```json
  { "success": true, "message": "Application updated successfully", "data": { ... } }
  ```

---

### 5. 取得登入者所有申請ID（摘要）

- `GET /api/applications/me`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Response：
  ```json
  {
    "success": true,
    "data": [
      { "application_id": 1, "created_at": "2025-01-01T08:00:00Z", "updated_at": "2025-01-02T09:00:00Z" },
      ...
    ]
  }
  ```

---

### 6. 取得完整申請封包（含 user, interruption_periods）

- `GET /api/applications/:id/package`
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Response：
  ```json
  {
    "success": true,
    "data": {
      "application": { ... },
      "user": { ... },
      "interruption_periods": [
        { "period_id": 1, "application_id": 1, "start_date": "2025-01-10", "end_date": "2025-01-20", ... },
        ...
      ]
    }
  }
  ```

---

## 斷續時間 API（如需）

- 目前斷續時間（interruption_periods）僅於 `/api/applications/:id/package` 取得。
- 若需 CRUD，請補充需求。

---

## 錯誤回應格式

```json
{ "success": false, "message": "錯誤訊息" }
```

---

## 啟動方式

1. 請參考 `docker-compose.yml` 啟動所有服務。
2. MariaDB 啟動時自動執行 `init.sql` 建表。
3. Node.js 服務於 3000 port，Python RAG 服務於 5001 port。

---

## 其他

- 請將 JWT_SECRET 設於 .env 或 docker-compose 環境變數。
- 所有日期格式皆為 `YYYY-MM-DD`，時間格式為 `HH:mm:ss`。
- 若有新需求請補充。