const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// --- 設定 ---
// 【*** 關鍵更新 ***】
// 我們的目標檔案現在是您新上傳的 form_template_update.pdf
const pdfPath = path.join(__dirname, 'assets', 'form_template_update.pdf'); 

async function listPdfFields() {
    console.log(`正在讀取 PDF 檔案: ${pdfPath}`);
    if (!fs.existsSync(pdfPath)) {
        console.error(`錯誤：找不到 PDF 檔案！`);
        console.error(`請確認您的 'form_template_update.pdf' 檔案已放置在 'nodejs_app/assets/' 資料夾中。`);
        return;
    }

    try {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        console.log('PDF 載入成功。正在嘗試獲取表單 (AcroForm)...');
        
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        if (!fields || fields.length === 0) {
            console.log('\n--- 結果 ---');
            console.log('在此 PDF 中未找到任何 AcroForm 表單欄位。');
            console.log('這確認了它是一個「平面」PDF，您必須使用 field_map.json 座標法。');
            console.log('-------------');
            return;
        }

        console.log(`\n--- 成功找到 ${fields.length} 個表單欄位 ---`);
        fields.forEach((field, index) => {
            const name = field.getName ? field.getName() : `(無法獲取名稱 - Index ${index})`;
            const type = field.constructor.name; // 欄位類型 (例如 TextField, CheckBox)
            
            console.log(`\n欄位 ${index + 1}:`);
            console.log(`  > 名稱 (Name): ${name}`);
            console.log(`  > 類型 (Type): ${type}`);
        });
        console.log('\n--- 列表結束 ---');

    } catch (error) {
        console.error('\n處理 PDF 時發生錯誤:', error);
        if (error.message.includes('PDF document has no AcroForm')) {
             console.log('詳細錯誤：這個 PDF 文件不包含 AcroForm 結構。');
        }
    }
}

// 執行函式
listPdfFields();