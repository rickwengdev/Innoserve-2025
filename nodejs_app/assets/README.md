# PDF 資源檔案

此目錄存放 PDF 產生所需的資源：

## 必要檔案

- **`form_template.pdf`** - PDF 申請書模板（必須）
- **`field_map.json`** - 欄位座標對映設定（必須）

## 可選檔案

- **`fonts/`** - 中文字型檔案（建議提供 .otf 或 .ttf 以正確顯示中文）

## field_map.json 範例

```json
{
  "page": 1,
  "origin": "bottom-left",
  "fontSize": 10,
  "fields": {
    "applicant_name": { "x": 120, "y": 705, "size": 11 }
  }
}
```

座標系統：原點 (0,0) 在左下角，X 軸向右，Y 軸向上。
