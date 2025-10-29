const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fontkit = require('fontkit');
const dayjs = require('dayjs');

// --- 設定 ---
// 確定資產路徑
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
// 模板候選：優先使用 form_template.pdf，其次使用 申請書與收據.pdf
const TEMPLATE_CANDIDATES = ['form_template.pdf', '申請書與收據.pdf'];
// 嵌入中文字型：在 assets/fonts/ 資料夾中尋找可用的字型（多個候選）
const FONT_CANDIDATES = [
    path.join('fonts', 'NotoSansTC-Regular.otf'),
    path.join('fonts', 'NotoSansCJKtc-Regular.otf'),
    path.join('fonts', 'NotoSansTC-Regular.ttf'),
    path.join('fonts', 'NotoSansCJKtc-Regular.ttf')
];

function findTemplatePath() {
    for (const name of TEMPLATE_CANDIDATES) {
        const p = path.join(ASSETS_DIR, name);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

/**
 * 載入 PDF 模板
 */
async function loadTemplate() {
    const p = findTemplatePath();
    if (!p) throw new Error(`PDF 模板檔案不存在於 assets/: ${TEMPLATE_CANDIDATES.join(', ')}`);
    const bytes = fs.readFileSync(p);
    const pdfDoc = await PDFDocument.load(bytes);
    pdfDoc.registerFontkit(fontkit);
    return pdfDoc;
}

/**
 * 載入並嵌入中文字型
 * @param {PDFDocument} pdfDoc 
 */
async function loadFont(pdfDoc) {
    // Try unicode font candidates
    for (const rel of FONT_CANDIDATES) {
        const p = path.join(ASSETS_DIR, rel);
        console.log(`Checking font path: ${p}, exists: ${fs.existsSync(p)}`);
        if (fs.existsSync(p)) {
            try {
                console.log(`Loading font from: ${p}`);
                const fontBytes = fs.readFileSync(p);
                console.log(`Font bytes loaded: ${fontBytes.length} bytes`);
                const font = await pdfDoc.embedFont(fontBytes);
                console.log(`Font embedded successfully: ${p}`);
                return font;
            } catch (err) {
                console.error(`Failed to embed font ${p}:`, err.message);
            }
        }
    }
    console.warn(`未找到可用中文字型（assets/fonts），將使用 Helvetica 可能無法顯示中文。`);
    return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

/**
 * 輔助函式：在特定座標繪製文字
 * @param {PDFPage} page
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {PDFFont} font
 * @param {number} size
 */
function draw(page, text, x, y, font, size = 10) {
    if (text === null || text === undefined) return;
    page.drawText(String(text), {
        x,
        y,
        font,
        size,
        color: rgb(0, 0, 0)
    });
}

/**
 * 輔助函式：在特定座標繪製 'X' (用於核取方塊)
 * @param {PDFPage} page
 * @param {number} x
 * @param {number} y
 * @param {PDFFont} font
 */
function drawCheck(page, x, y, font) {
    draw(page, 'X', x, y, font, 12);
}

/**
 * 輔助函式：格式化日期為 ROC (民國年)
 * @param {string} dateStr 
 */
function formatROC(dateStr) {
    if (!dateStr) return { year: '', month: '', day: '' };
    const d = dayjs(dateStr);
    if (!d.isValid()) return { year: '', month: '', day: '' };
    return {
        year: String(d.year() - 1911),
        month: d.format('MM'),
        day: d.format('DD')
    };
}

function loadFieldMap() {
    const mapPath = path.join(ASSETS_DIR, 'field_map.json');
    if (!fs.existsSync(mapPath)) return null;
    try {
        const raw = fs.readFileSync(mapPath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.warn('讀取 field_map.json 失敗:', e.message);
        return null;
    }
}

function buildDataDict(pkg) {
    const user = pkg.user || {};
    const app = pkg.application || {};
    return {
        applicant_name: user.username,
        applicant_email: user.email,
        id_number: user.ID_number,
        dob: user.DOB,
        phone: user.telephone,
        address: user.useraddress,
        zip_code: user.ZIP_code,

        application_id: app.application_id,
        eligibility_criteria: app.eligibility_criteria,
        types_of_wounded: app.types_of_wounded,
        injury_date: app.injury_date,
        injury_time: app.injury_time ?? '',
        injury_location: app.injury_location,
        injury_cause: app.injury_cause,
        is_reinstated: app.is_reinstated ? '是' : '否',
        reinstatement_date: app.reinstatement_date,
        salary_status: app.salary_status,
        salary_type: app.salary_type,
        injury_type: app.injury_type,
        work_content: app.work_content,

        interruption_periods: (pkg.interruption_periods || [])
            .map(p => `${formatROC(p.start_date).year}/${formatROC(p.start_date).month}/${formatROC(p.start_date).day}`
                + ' ~ ' + `${formatROC(p.end_date).year}/${formatROC(p.end_date).month}/${formatROC(p.end_date).day}`)
            .join('\n')
    };
}

function guessValueByFieldName(fieldName, dict) {
    const n = (fieldName || '').toLowerCase();
    const contains = (...arr) => arr.some(k => n.includes(k));
    if (contains('name', 'username', '姓名', '申請人')) return dict.applicant_name;
    if (contains('email', '信箱')) return dict.applicant_email;
    if (contains('id', '身分', '身份', '證號')) return dict.id_number;
    if (contains('birth', 'dob', '出生')) return dict.dob;
    if (contains('phone', 'tel', '電話')) return dict.phone;
    if (contains('addr', 'address', '住址', '地址')) return dict.address;
    if (contains('zip', '郵遞區號', '郵遞')) return dict.zip_code;

    if (contains('application_id', '申請編號', '編號')) return String(dict.application_id || '');
    if (contains('eligibility', '請領', '資格')) return String(dict.eligibility_criteria ?? '');
    if (contains('wounded', '傷兵', '類別')) return String(dict.types_of_wounded ?? '');
    if (contains('injury_date', '受傷日期')) return dict.injury_date;
    if (contains('injury_time', '受傷時間')) return dict.injury_time;
    if (contains('injury_location', '受傷地點', '地點')) return dict.injury_location;
    if (contains('injury_cause', '受傷原因', '原因')) return dict.injury_cause;
    if (contains('reinstated', '復工', '是否復工')) return dict.is_reinstated;
    if (contains('reinstatement_date', '復工日期')) return dict.reinstatement_date;
    if (contains('salary_status', '薪資情形', '薪資狀況')) return String(dict.salary_status ?? '');
    if (contains('salary_type', '薪資類別')) return dict.salary_type;
    if (contains('injury_type', '傷害類型')) return dict.injury_type;
    if (contains('work_content', '工作內容')) return dict.work_content;
    if (contains('interruption', 'period', '斷續', '休假', '期間')) return dict.interruption_periods;
    return '';
}

function applyFieldMap(pdfDoc, font, map, dict) {
  const pages = pdfDoc.getPages();
  const pageIndex = Math.max(0, (map.page || 1) - 1);
  const page = pages[pageIndex] || pages[0];
  const pageHeight = page.getHeight();
  const originTopLeft = (map.origin || '').toLowerCase().includes('top');
  const defaultSize = map.fontSize || 10;
  const safeY = (y) => (originTopLeft ? pageHeight - y : y);
  const safe = (v) => (v == null ? '' : String(v));

  for (const [key, cfg] of Object.entries(map.fields || {})) {
    const v = dict[key];
    if (v == null || v === '') continue;
    const x = cfg.x || 0;
    const y = cfg.y || 0;
    const size = cfg.size || defaultSize;
    page.drawText(safe(v), { x, y: safeY(y), size, font, color: rgb(0, 0, 0) });
  }
}

/**
 * 產生填寫完畢的 PDF 申請書
 * @param {object} pkg - { application, user, interruption_periods }
 * @returns {Promise<Buffer>} PDF 檔案的 Buffer
 */
async function generateApplicationPdf(pkg, options = {}) {
  const { title, showReceipt = true } = options;
  const pdfDoc = await loadTemplate();
  const font = await loadFont(pdfDoc);    // Metadata（不影響版面，但有助於檔案資訊）
    try {
        pdfDoc.setTitle(title || '申請書與收據');
        if (pkg?.user?.username || pkg?.user?.email) {
            pdfDoc.setAuthor(String(pkg.user.username || pkg.user.email));
        }
        pdfDoc.setCreationDate(new Date());
        pdfDoc.setProducer('innoserve nodejs_app pdfService');
    } catch (_) {}

    const pages = pdfDoc.getPages();
    const page1 = pages[0];

    // 1) 先嘗試填既有 AcroForm 欄位
    let applied = false;
    try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        if (fields && fields.length) {
            const dict = buildDataDict(pkg);
            fields.forEach((f) => {
                const name = f.getName ? f.getName() : '';
                const v = guessValueByFieldName(name, dict);
                if (!v) return;
                if (typeof f.setText === 'function') {
                    try { f.setText(String(v)); } catch (_) {}
                } else if (typeof f.check === 'function') {
                    const truthy = ['yes', 'true', '1', '是', '有'].includes(String(v).toLowerCase());
                    try { if (truthy) f.check(); else f.uncheck && f.uncheck(); } catch (_) {}
                } else if (typeof f.select === 'function') {
                    try { f.select(String(v)); } catch (_) {}
                }
            });
            form.updateFieldAppearances(font);
            applied = true;
        }
    } catch (_) {}

  // 2) 若沒有 AcroForm，改用 assets/field_map.json 的座標配置
  if (!applied) {
    const map = loadFieldMap();
    if (map) {
      const dict = buildDataDict(pkg);
      applyFieldMap(pdfDoc, font, map, dict);
      applied = true;
    }
  }

  // 3) 若以上皆無，提示使用者需要建立 field_map.json
  if (!applied) {
    console.warn('警告: PDF 模板無 AcroForm 欄位且未找到 field_map.json，請建立座標對映檔。');
  }

  // 4) 視需要追加收據頁
  if (showReceipt) {
    const receipt = pdfDoc.addPage();
    let ry = receipt.getHeight() - 60;
    draw(receipt, '收據 Receipt', 60, ry, font, 14); ry -= 24;
    
    // 申請人
    draw(receipt, '申請人: ' + (pkg?.user?.username ?? ''), 60, ry, font, 10); ry -= 16;
    // Email (純顯示，無前綴)
    draw(receipt, pkg?.user?.email ?? '', 60, ry, font, 10); ry -= 16;
    // 申請編號
    draw(receipt, '申請編號: ' + (pkg?.application?.application_id ?? ''), 60, ry, font, 10); ry -= 16;
    // 日期
    const c = dayjs();
    draw(receipt, '日期: ' + `${c.year() - 1911}/${c.format('MM')}/${c.format('DD')}`, 60, ry, font, 10); ry -= 16;
    
    ry -= 10;
    draw(receipt, '簽名 Signature: _______________________________', 60, ry, font, 10);
  }

    // 5) 頁碼
    try {
        const all = pdfDoc.getPages();
        const cnt = all.length;
        for (let i = 0; i < cnt; i++) {
            const p = all[i];
            draw(p, `${i + 1} / ${cnt}`, p.getWidth() - 60, 20, font, 9);
        }
    } catch (_) {}

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

module.exports = {
  generateApplicationPdf,
};
