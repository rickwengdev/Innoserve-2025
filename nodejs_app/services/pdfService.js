/**
 * @fileoverview PDF 申請書生成服務
 * 負責將申請資料填入 PDF 表單並生成完整的申請書文件
 * 支援 AcroForm 表單欄位自動填寫與座標對映兩種方式
 * 
 * @author Rick
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fontkit = require('fontkit');
const dayjs = require('dayjs');

// ============================================================================
// 全域常數設定
// ============================================================================

/** 資產檔案目錄路徑 */
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/** 
 * PDF 模板候選檔案列表（按優先順序排列）
 * form_template_update.pdf 包含完整的 AcroForm 互動式表單欄位
 */
const TEMPLATE_CANDIDATES = [
  '勞工保險傷病給付申請書及給付收據.pdf'
];

/** 
 * 中文字型候選檔案列表（按優先順序排列）
 * 在 assets/fonts/ 目錄中搜尋可用的 Noto Sans TC 字型
 */
const FONT_CANDIDATES = [
  path.join('fonts', 'NotoSansTC-Regular.otf'),
  path.join('fonts', 'NotoSansCJKtc-Regular.otf'),
  path.join('fonts', 'NotoSansTC-Regular.ttf'),
  path.join('fonts', 'NotoSansCJKtc-Regular.ttf')
];

// ============================================================================
// 私有輔助函式
// ============================================================================

/**
 * 尋找可用的 PDF 模板檔案路徑
 * 按照 TEMPLATE_CANDIDATES 順序尋找第一個存在的檔案
 * 
 * @private
 * @returns {string|null} 模板檔案的完整路徑，若無可用檔案則返回 null
 */
function findTemplatePath() {
  for (const name of TEMPLATE_CANDIDATES) {
    const p = path.join(ASSETS_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * 載入 PDF 模板文件
 * 從 assets 目錄中載入可用的 PDF 模板並註冊字型工具包
 * 
 * @async
 * @private
 * @returns {Promise<PDFDocument>} PDF 文件物件
 * @throws {Error} 當找不到任何可用的模板檔案時拋出錯誤
 */
async function loadTemplate() {
  const p = findTemplatePath();
  if (!p) {
    throw new Error(
      `PDF 模板檔案不存在於 assets/: ${TEMPLATE_CANDIDATES.join(', ')}`
    );
  }
  const bytes = fs.readFileSync(p);
  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.registerFontkit(fontkit);
  return pdfDoc;
}

/**
 * 載入並嵌入中文字型到 PDF 文件
 * 依序嘗試載入 FONT_CANDIDATES 中的字型，若全部失敗則使用 Helvetica
 * 
 * @async
 * @private
 * @param {PDFDocument} pdfDoc - PDF 文件物件
 * @returns {Promise<PDFFont>} 嵌入的字型物件
 */
async function loadFont(pdfDoc) {
  // 嘗試載入候選中文字型
  for (const rel of FONT_CANDIDATES) {
    const p = path.join(ASSETS_DIR, rel);
    console.log(`檢查字型路徑: ${p}, 存在: ${fs.existsSync(p)}`);
    if (fs.existsSync(p)) {
      try {
        console.log(`載入字型: ${p}`);
        const fontBytes = fs.readFileSync(p);
        console.log(`字型檔案大小: ${fontBytes.length} bytes`);
        const font = await pdfDoc.embedFont(fontBytes);
        console.log(`字型嵌入成功: ${p}`);
        return font;
      } catch (err) {
        console.error(`嵌入字型失敗 ${p}:`, err.message);
      }
    }
  }
  
  // 找不到中文字型時使用預設字型
  console.warn(
    '未找到可用中文字型（assets/fonts），將使用 Helvetica 可能無法顯示中文。'
  );
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

/**
 * 在 PDF 頁面的指定座標繪製文字
 * 
 * @private
 * @param {PDFPage} page - PDF 頁面物件
 * @param {string} text - 要繪製的文字內容
 * @param {number} x - X 座標（從左邊起算）
 * @param {number} y - Y 座標（從下方起算）
 * @param {PDFFont} font - 字型物件
 * @param {number} [size=10] - 字體大小（預設 10）
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
 * 在 PDF 頁面的指定座標繪製核取記號 'X'
 * 用於標記 checkbox 欄位
 * 
 * @private
 * @param {PDFPage} page - PDF 頁面物件
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @param {PDFFont} font - 字型物件
 */
function drawCheck(page, x, y, font) {
  draw(page, 'X', x, y, font, 12);
}

/**
 * 將西元日期轉換為中華民國年份格式
 * 
 * @private
 * @param {string} dateStr - ISO 8601 格式的日期字串（如 "2024-10-15"）
 * @returns {{year: string, month: string, day: string}} 民國年月日物件
 * @example
 * formatROC('2024-10-15')
 * // 返回: { year: '113', month: '10', day: '15' }
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

/**
 * 載入欄位座標對映設定檔
 * 當 PDF 模板不包含 AcroForm 欄位時使用此對映檔進行座標填寫
 * 
 * @private
 * @returns {object|null} 欄位對映設定物件，若檔案不存在或解析失敗則返回 null
 */
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

/**
 * 建立資料字典供 PDF 填寫使用
 * 將資料庫的申請資料轉換為適合填入 PDF 的格式
 * 
 * @private
 * @param {object} pkg - 完整申請資料包
 * @param {object} pkg.user - 使用者資料
 * @param {object} pkg.application - 申請資料
 * @param {Array} [pkg.interruption_periods] - 工作中斷期間陣列
 * @returns {object} 格式化後的資料字典
 */
function buildDataDict(pkg) {
  const user = pkg.user || {};
  const app = pkg.application || {};
  return {
    // 申請人基本資料
    applicant_name: app.applicant_name || user.username,
    applicant_email: user.email,
    id_number: app.ID_number,
    dob: app.DOB,
    phone: app.telephone,
    address: app.useraddress,
    zip_code: app.ZIP_code,

    // 申請案件資料
    application_id: app.application_id,
    eligibility_criteria: app.eligibility_criteria,
    // 表單欄位維持舊名，但資料來自新欄位 types_of_injury
    types_of_wounded: app.types_of_injury,
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

    // 工作中斷期間（格式化為民國年月日範圍字串）
    interruption_periods: (
      pkg.interruption_periods && pkg.interruption_periods.length
        ? pkg.interruption_periods
        : (app.salary_status_period_start || app.salary_status_period_end)
            ? [{ start_date: app.salary_status_period_start, end_date: app.salary_status_period_end }]
            : []
    )
      .map(p => {
        const start = formatROC(p.start_date);
        const end = formatROC(p.end_date);
        return `${start.year}/${start.month}/${start.day} ~ ${end.year}/${end.month}/${end.day}`;
      })
      .join('\n')
  };
}


// ============================================================================
// AcroForm 表單欄位填寫
// ============================================================================

/**
 * 填寫 PDF AcroForm 互動式表單欄位
 * 根據 form_template_update.pdf 的實際欄位名稱進行對應填寫
 * 支援文字欄位（TextField）與核取方塊（CheckBox）兩種類型
 * 
 * @private
 * @param {PDFForm} form - PDF 表單物件
 * @param {object} dict - 資料字典（由 buildDataDict 產生）
 * @param {PDFFont} font - 字型物件
 * 
 * @description
 * 此函式處理以下類型的表單欄位：
 * - 基本資料：姓名、身分證、生日（年月日分開）、地址、郵遞區號、電話
 * - 申請資格：請領資格、傷病類別（checkbox）
 * - 受傷資訊：日期、時間（上午/下午 + 時:分）、地點、原因
 * - 復工資訊：是否復工（checkbox）、復工日期
 * - 薪資資訊：薪資情形、薪資類別（checkbox）
 * - 傷害類型（checkbox）
 * - 工作內容
 * - 不能工作連續期間
 * - 銀行帳戶資訊
 */
function fillAcroFormFields(form, dict, font) {
  const app = dict;
  
  // 1. 填寫基本資料欄位
  try {
    const nameField = form.getTextField('name');
    if (nameField && app.applicant_name) {
      nameField.setText(String(app.applicant_name));
    }
  } catch (_) {}
  
  try {
    const idField = form.getTextField('ID_Number');
    if (idField && app.id_number) {
      idField.setText(String(app.id_number));
    }
  } catch (_) {}
  
  // 2. 填寫生日（拆分為年、月、日三個欄位）
  if (app.dob) {
    const dobRoc = formatROC(app.dob);
    try {
      const dobY = form.getTextField('DOB_Y');
      if (dobY) dobY.setText(dobRoc.year);
    } catch (_) {}
    try {
      const dobM = form.getTextField('DOB_M');
      if (dobM) dobM.setText(dobRoc.month);
    } catch (_) {}
    try {
      const dobD = form.getTextField('DOB_D');
      if (dobD) dobD.setText(dobRoc.day);
    } catch (_) {}
  }
  
  // 3. 填寫地址與郵遞區號
  try {
    const addrField = form.getTextField('Address');
    if (addrField && app.address) {
      addrField.setText(String(app.address));
    }
  } catch (_) {}
  
  // 郵遞區號分為兩個欄位（前 3 碼與後 2 碼）
  if (app.zip_code) {
    const zipStr = String(app.zip_code);
    try {
      const zip1 = form.getTextField('ZIP_code_1');
      if (zip1) zip1.setText(zipStr.substring(0, 3));
    } catch (_) {}
    try {
      const zip2 = form.getTextField('ZIP_code_2');
      if (zip2) zip2.setText(zipStr.substring(3));
    } catch (_) {}
  }
  
  // 4. 填寫電話號碼
  try {
    const phoneField = form.getTextField('Phone_number');
    if (phoneField && app.phone) {
      phoneField.setText(String(app.phone));
    }
  } catch (_) {}
  
  // 5. 填寫請領資格（單選 checkbox: 0, 1, 2）
  if (app.eligibility_criteria !== null && app.eligibility_criteria !== undefined) {
    const eligIdx = parseInt(app.eligibility_criteria);
    [0, 1, 2].forEach(i => {
      try {
        const cb = form.getCheckBox(`eligibility_criteria_${i}`);
        if (cb) {
          if (i === eligIdx) cb.check(); 
          else cb.uncheck();
        }
      } catch (_) {}
    });
  }
  
  // 6. 填寫傷病類別（單選 checkbox: 0, 1）
  if (app.types_of_wounded !== null && app.types_of_wounded !== undefined) {
    const woundedIdx = parseInt(app.types_of_wounded);
    [0, 1].forEach(i => {
      try {
        const cb = form.getCheckBox(`types_of_wounded_${i}`);
        if (cb) {
          if (i === woundedIdx) cb.check(); 
          else cb.uncheck();
        }
      } catch (_) {}
    });
  }
  
  // 7. 填寫受傷日期（年、月、日分開）
  if (app.injury_date) {
    const injRoc = formatROC(app.injury_date);
    try {
      const injY = form.getTextField('injury_date_y');
      if (injY) injY.setText(injRoc.year);
    } catch (_) {}
    try {
      const injM = form.getTextField('injury_date_m');
      if (injM) injM.setText(injRoc.month);
    } catch (_) {}
    try {
      const injD = form.getTextField('injury_date_d');
      if (injD) injD.setText(injRoc.day);
    } catch (_) {}
  }
  
  // 8. 填寫受傷時間（上午/下午 checkbox + 時:分文字欄位）
  // 新 schema 提供 injury_time_type (0=上午, 1=下午)，若缺則從字串判斷
  if (app.injury_time) {
    const timeStr = String(app.injury_time);
    const isMorning = app.injury_time_type === 0 || timeStr.includes('上午');
    const isAfternoon = app.injury_time_type === 1 || timeStr.includes('下午');
    
    try {
      const cbMorning = form.getCheckBox('injury_time_moring');
      if (cbMorning) {
        if (isMorning) cbMorning.check(); 
        else cbMorning.uncheck();
      }
    } catch (_) {}
    
    try {
      const cbAfternoon = form.getCheckBox('injury_time_afternoon');
      if (cbAfternoon) {
        if (isAfternoon) cbAfternoon.check(); 
        else cbAfternoon.uncheck();
      }
    } catch (_) {}
    
    // 提取時間（HH:MM 格式）
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      try {
        const hourField = form.getTextField('injury_time_hour');
        if (hourField) hourField.setText(match[1]);
      } catch (_) {}
      try {
        const minField = form.getTextField('injury_time_min');
        if (minField) minField.setText(match[2]);
      } catch (_) {}
    }
  }
  
  // 9. 填寫受傷地點
  try {
    const locField = form.getTextField('injury_location');
    if (locField && app.injury_location) {
      locField.setText(String(app.injury_location));
    }
  } catch (_) {}
  
  // 10. 填寫受傷原因
  try {
    const causeField = form.getTextField('injury_cause');
    if (causeField && app.injury_cause) {
      causeField.setText(String(app.injury_cause));
    }
  } catch (_) {}
  
  // 11. 填寫是否復工（checkbox: 0=否, 1=是）
  try {
    const cb0 = form.getCheckBox('is_reinstated_0');
    const cb1 = form.getCheckBox('is_reinstated_1');
    if (app.is_reinstated === '是' || app.is_reinstated === true) {
      if (cb1) cb1.check();
      if (cb0) cb0.uncheck();
    } else {
      if (cb0) cb0.check();
      if (cb1) cb1.uncheck();
    }
  } catch (_) {}
  
  // 12. 填寫復工日期（年、月、日分開）
  if (app.reinstatement_date) {
    const reinRoc = formatROC(app.reinstatement_date);
    try {
      const reinY = form.getTextField('reinstatement_date_Y');
      if (reinY) reinY.setText(reinRoc.year);
    } catch (_) {}
    try {
      const reinM = form.getTextField('reinstatement_date_M');
      if (reinM) reinM.setText(reinRoc.month);
    } catch (_) {}
    try {
      const reinD = form.getTextField('reinstatement_date_D');
      if (reinD) reinD.setText(reinRoc.day);
    } catch (_) {}
  }
  
  // 13. 填寫薪資情形（單選 checkbox: 0, 1）
  if (app.salary_status !== null && app.salary_status !== undefined) {
    const salStatusIdx = parseInt(app.salary_status);
    [0, 1].forEach(i => {
      try {
        const cb = form.getCheckBox(`salary_status_${i}`);
        if (cb) {
          if (i === salStatusIdx) cb.check(); 
          else cb.uncheck();
        }
      } catch (_) {}
    });
  }
  
  // 14. 填寫薪資類別（單選 checkbox: 0, 1, 2, 3）
  if (app.salary_type !== null && app.salary_type !== undefined) {
    const salTypeIdx = parseInt(app.salary_type);
    [0, 1, 2, 3].forEach(i => {
      try {
        const cb = form.getCheckBox(`salary_type_${i}`);
        if (cb) {
          if (i === salTypeIdx) cb.check(); 
          else cb.uncheck();
        }
      } catch (_) {}
    });
  }
  
  // 15. 填寫傷害類型（單選 checkbox: 0, 1, 2, 3）
  if (app.injury_type !== null && app.injury_type !== undefined) {
    const injTypeIdx = parseInt(app.injury_type);
    [0, 1, 2, 3].forEach(i => {
      try {
        const cb = form.getCheckBox(`injury_type_${i}`);
        if (cb) {
          if (i === injTypeIdx) cb.check(); 
          else cb.uncheck();
        }
      } catch (_) {}
    });
  }
  
  // 16. 填寫工作內容
  try {
    const workField = form.getTextField('work_content');
    if (workField && app.work_content) {
      workField.setText(String(app.work_content));
    }
  } catch (_) {}
  
  // 17. 填寫不能工作連續期間（僅填寫第一筆記錄）
  // 欄位名稱為 salary_status_0_start/end_y/m/d
  if (app.salary_status_period_start && app.salary_status_period_end.length) {
    const period = {
      start_date: app.salary_status_period_start,
      end_date: app.salary_status_period_end
    };
    // 開始日期
    if (period.start_date) {
      const startRoc = formatROC(period.start_date);
      try {
        const sy = form.getTextField('salary_status_0_start_y');
        if (sy) sy.setText(startRoc.year);
      } catch (_) {}
      try {
        const sm = form.getTextField('salary_status_0_start_m');
        if (sm) sm.setText(startRoc.month);
      } catch (_) {}
      try {
        const sd = form.getTextField('salary_status_0_start_d');
        if (sd) sd.setText(startRoc.day);
      } catch (_) {}
    }
    
    // 結束日期
    if (period.end_date) {
      const endRoc = formatROC(period.end_date);
      try {
        const ey = form.getTextField('salary_status_0_end_y');
        if (ey) ey.setText(endRoc.year);
      } catch (_) {}
      try {
        const em = form.getTextField('salary_status_0_end_m');
        if (em) em.setText(endRoc.month);
      } catch (_) {}
      try {
        const ed = form.getTextField('salary_status_0_end_d');
        if (ed) ed.setText(endRoc.day);
      } catch (_) {}
    }
  }

  // 18. 填寫銀行帳戶資訊
  try {
    const bankField = form.getTextField('bank_account');
    if (bankField && app.bank_account) {
      bankField.setText(String(app.bank_account));
    }
  } catch (_) {}

  try {
    const bankCodeField = form.getTextField('bank_code');
    if (bankCodeField && app.bank_code) {
      bankCodeField.setText(String(app.bank_code));
    }
  } catch (_) {}

  try {
    const branchCodeField = form.getTextField('branch_code');
    if (branchCodeField && app.branch_code) {
      branchCodeField.setText(String(app.branch_code));
    }
  } catch (_) {}
}


// ============================================================================
// 座標對映填寫（fallback 方案）
// ============================================================================

/**
 * 使用座標對映檔填寫 PDF 內容
 * 當 PDF 模板不包含 AcroForm 欄位時的後備方案
 * 
 * @private
 * @param {PDFDocument} pdfDoc - PDF 文件物件
 * @param {PDFFont} font - 字型物件
 * @param {object} map - 座標對映設定物件（從 field_map.json 載入）
 * @param {object} dict - 資料字典
 * 
 * @description
 * field_map.json 的結構範例：
 * {
 *   "page": 1,
 *   "origin": "top-left",
 *   "fontSize": 10,
 *   "fields": {
 *     "applicant_name": { "x": 100, "y": 200, "size": 12 },
 *     "id_number": { "x": 100, "y": 180 }
 *   }
 * }
 */
function applyFieldMap(pdfDoc, font, map, dict) {
  const pages = pdfDoc.getPages();
  const pageIndex = Math.max(0, (map.page || 1) - 1);
  const page = pages[pageIndex] || pages[0];
  const pageHeight = page.getHeight();
  const originTopLeft = (map.origin || '').toLowerCase().includes('top');
  const defaultSize = map.fontSize || 10;
  
  // 座標轉換函式（處理不同的座標原點）
  const safeY = (y) => (originTopLeft ? pageHeight - y : y);
  const safe = (v) => (v == null ? '' : String(v));

  // 依序填寫每個欄位
  for (const [key, cfg] of Object.entries(map.fields || {})) {
    const v = dict[key];
    if (v == null || v === '') continue;
    
    const x = cfg.x || 0;
    const y = cfg.y || 0;
    const size = cfg.size || defaultSize;
    
    page.drawText(safe(v), { 
      x, 
      y: safeY(y), 
      size, 
      font, 
      color: rgb(0, 0, 0) 
    });
  }
}

// ============================================================================
// 主要匯出函式
// ============================================================================

/**
 * 產生填寫完畢的 PDF 申請書
 * 
 * @async
 * @param {object} pkg - 完整申請資料包
 * @param {object} pkg.application - 申請資料
 * @param {object} pkg.user - 使用者資料
 * @param {Array} [pkg.interruption_periods] - 工作中斷期間陣列
 * @param {object} [options={}] - 選項設定
 * @param {string} [options.title] - PDF 標題（預設：'申請書與收據'）
 * @param {boolean} [options.showReceipt=true] - 是否附加收據頁
 * @returns {Promise<Buffer>} PDF 檔案的 Buffer
 * 
 * @description
 * 此函式執行以下步驟：
 * 1. 載入 PDF 模板與字型
 * 2. 設定 PDF 元資料（標題、作者、建立時間）
 * 3. 嘗試填寫 AcroForm 欄位（若存在）
 * 4. 若無 AcroForm，則使用座標對映填寫
 * 5. 可選擇性附加收據頁
 * 6. 在每頁底部加上頁碼
 * 
 * @example
 * const pdfBuffer = await generateApplicationPdf({
 *   application: { injury_date: '2024-10-15', ... },
 *   user: { username: '張三', ... },
 *   interruption_periods: []
 * }, {
 *   title: '職業傷害申請書',
 *   showReceipt: true
 * });
 */
async function generateApplicationPdf(pkg, options = {}) {
  const { title, showReceipt = true } = options;
  const pdfDoc = await loadTemplate();
  const font = await loadFont(pdfDoc);
  
  // 設定 PDF 元資料（不影響視覺內容，但有助於檔案管理）
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

  // 策略 1: 嘗試填寫 AcroForm 互動式表單欄位
  let applied = false;
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (fields && fields.length) {
      const dict = buildDataDict(pkg);
      fillAcroFormFields(form, dict, font);
      applied = true;
    }
  } catch (e) {
    console.warn('填寫 AcroForm 欄位時發生錯誤:', e.message);
  }

  // 策略 2: 若無 AcroForm，改用座標對映檔 field_map.json
  if (!applied) {
    const map = loadFieldMap();
    if (map) {
      const dict = buildDataDict(pkg);
      applyFieldMap(pdfDoc, font, map, dict);
      applied = true;
    }
  }

  // 策略 3: 若兩者皆無，提示使用者建立座標對映檔
  if (!applied) {
    console.warn(
      '警告: PDF 模板無 AcroForm 欄位且未找到 field_map.json，請建立座標對映檔。'
    );
  }

  // 附加收據頁（可選）
  if (showReceipt) {
    const receipt = pdfDoc.addPage();
    let ry = receipt.getHeight() - 60;
    
    // 收據標題
    draw(receipt, '收據 Receipt', 60, ry, font, 14); 
    ry -= 24;
    
    // 申請人資訊
    draw(receipt, '申請人: ' + (pkg?.user?.username ?? ''), 60, ry, font, 10); 
    ry -= 16;
    draw(receipt, pkg?.user?.email ?? '', 60, ry, font, 10); 
    ry -= 16;
    
    // 申請編號
    draw(receipt, '申請編號: ' + (pkg?.application?.application_id ?? ''), 60, ry, font, 10); 
    ry -= 16;
    
    // 當前日期（民國年）
    const c = dayjs();
    const rocDate = `${c.year() - 1911}/${c.format('MM')}/${c.format('DD')}`;
    draw(receipt, '日期: ' + rocDate, 60, ry, font, 10); 
    ry -= 16;
    
    // 簽名欄位
    ry -= 10;
    draw(receipt, '簽名 Signature: _______________________________', 60, ry, font, 10);
  }

  // 在每頁底部加上頁碼
  try {
    const all = pdfDoc.getPages();
    const cnt = all.length;
    for (let i = 0; i < cnt; i++) {
      const p = all[i];
      draw(p, `${i + 1} / ${cnt}`, p.getWidth() - 60, 20, font, 9);
    }
  } catch (_) {}

  // 儲存並返回 PDF Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ============================================================================
// 模組匯出
// ============================================================================

module.exports = {
  generateApplicationPdf,
};
