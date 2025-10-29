# field_map.json 欄位說明

## 座標調整方法

1. 產生測試 PDF：
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"test123456"}' \
  | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/applications/1/pdf?receipt=0" \
  -o /tmp/test.pdf && open /tmp/test.pdf
```

2. 查看欄位位置，調整 field_map.json 中的 x, y 值

3. 重新執行步驟 1 驗證（不需重啟服務）

## 座標系統

- 原點 (0, 0) 在**左下角**
- X 軸向右遞增（0 → 595）
- Y 軸向上遞增（0 → 842）
- 文字從 (x, y) 的**左下角**開始繪製

## 調整技巧

- 文字太左 → x + 5
- 文字太右 → x - 5
- 文字太低 → y + 5
- 文字太高 → y - 5

## 欄位資料說明

### 使用者資訊

| 欄位 | 說明 | 範例資料 | 備註 |
|------|------|----------|------|
| applicant_name | 姓名 | 張三 | |
| applicant_email | Email | alice@example.com | |
| id_number | 身分證號 | A123456789 | |
| dob | 出生日期 | 1990-05-15 | ISO 格式，需自行轉民國年請見下方 |
| phone | 電話 | 02-12345678 | |
| zip_code | 郵遞區號 | 100 | |
| address | 地址 | 台北市中正區... | |

### 申請資訊

| 欄位 | 說明 | 範例資料 | 備註 |
|------|------|----------|------|
| application_id | 申請編號 | 1 | 數字 |
| eligibility_criteria | 請領資格 | 0, 1, 2 | 數字代碼 |
| types_of_wounded | 傷病類別 | 1, 2 | 1=職業傷害, 2=職業病 |
| injury_date | 受傷日期 | 2024-10-15 | ISO 格式 |
| injury_time | 受傷時間 | 14:30 | |
| injury_location | 受傷地點 | 工廠三樓 | |
| injury_cause | 受傷原因 | 機器操作不慎 | |
| is_reinstated | 是否復工 | 是/否 | 自動轉換 boolean |
| reinstatement_date | 復工日期 | 2024-11-01 | ISO 格式 |
| salary_status | 薪資情形 | 0, 1 | 0=連續, 1=斷續 |
| salary_type | 薪資類別 | 月薪/時薪 | |
| injury_type | 傷害類型 | 割傷/骨折 | |
| work_content | 工作內容 | 機台操作員 | |
| interruption_periods | 斷續期間 | 112/10/01 ~ 112/10/15<br>112/10/20 ~ 112/10/25 | 多行，自動格式化為民國年 |

## 如果需要民國年格式

目前日期欄位回傳的是 ISO 格式（例如 2024-10-15）。

如果表單需要分別填入**年/月/日**到不同欄位，可以修改 `pdfService.js` 的 `buildDataDict` 函式：

```javascript
// 在 buildDataDict 中加入
dob_roc_year: formatROC(user.DOB).year,
dob_roc_month: formatROC(user.DOB).month,
dob_roc_day: formatROC(user.DOB).day,

injury_date_roc_year: formatROC(app.injury_date).year,
injury_date_roc_month: formatROC(app.injury_date).month,
injury_date_roc_day: formatROC(app.injury_date).day,

reinstatement_date_roc_year: formatROC(app.reinstatement_date).year,
reinstatement_date_roc_month: formatROC(app.reinstatement_date).month,
reinstatement_date_roc_day: formatROC(app.reinstatement_date).day,
```

然後在 field_map.json 中：
```json
"dob_roc_year": { "x": 250, "y": 705, "size": 10 },
"dob_roc_month": { "x": 280, "y": 705, "size": 10 },
"dob_roc_day": { "x": 305, "y": 705, "size": 10 }
```

## 核取方塊處理

如果表單有核取方塊（☑），建議：

1. 在 `buildDataDict` 中根據值回傳 'X' 或空字串
2. 設定較小的座標和字型大小（size: 12）

範例：
```javascript
// pdfService.js buildDataDict 中
eligibility_check_0: app.eligibility_criteria === 0 ? 'X' : '',
eligibility_check_1: app.eligibility_criteria === 1 ? 'X' : '',
eligibility_check_2: app.eligibility_criteria === 2 ? 'X' : '',

types_wounded_check_1: app.types_of_wounded === 1 ? 'X' : '',
types_wounded_check_2: app.types_of_wounded === 2 ? 'X' : '',

salary_status_check_0: app.salary_status === 0 ? 'X' : '',
salary_status_check_1: app.salary_status === 1 ? 'X' : '',
```

field_map.json：
```json
"eligibility_check_0": { "x": 95, "y": 615, "size": 12 },
"eligibility_check_1": { "x": 95, "y": 600, "size": 12 },
"eligibility_check_2": { "x": 95, "y": 585, "size": 12 }
```

## 不需要的欄位

如果某些欄位在你的表單上不需要顯示，可以：
1. 從 field_map.json 中刪除該行
2. 或將座標設在表單外（例如 x: -100, y: -100）

## 多頁表單

如果需要在第 2、3、4 頁繪製欄位，修改 `page` 值：

目前設定是單一頁面配置。如需多頁，可以建立多個配置檔：
- `field_map_page1.json`
- `field_map_page2.json`

並修改 pdfService.js 來載入和應用多個配置。

或者將 field_map.json 改為陣列格式（需修改 loadFieldMap 和 applyFieldMap 函式）。

## 查看當前資料庫資料

```bash
docker exec -it innoserve_mariadb mariadb -u root -prootpassword app_db

# 查看使用者資料
SELECT * FROM users WHERE email = 'alice@example.com';

# 查看申請資料
SELECT * FROM applications WHERE application_id = 1;

# 查看斷續期間
SELECT * FROM interruption_periods WHERE application_id = 1;
```

## 測試資料範例

當前測試帳號和申請 ID 1 的資料會顯示在 PDF 上。

如果需要調整測試資料來驗證不同欄位的顯示效果，可以修改資料庫中的值。
