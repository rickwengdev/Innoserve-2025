#!/bin/bash
# PDF 座標調整快速測試腳本
# 使用方法：./test_pdf.sh

echo "正在登入並產生 PDF..."

TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"test123456"}' \
  | jq -r .token)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登入失敗"
  exit 1
fi

echo "✓ 已取得 Token"

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/applications/1/pdf?receipt=0" \
  -o /tmp/test.pdf

if [ $? -eq 0 ]; then
  echo "✓ PDF 已產生: /tmp/test.pdf"
  open /tmp/test.pdf
else
  echo "❌ PDF 產生失敗"
  exit 1
fi
