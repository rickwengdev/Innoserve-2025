const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const dayjs = require('dayjs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const TEMPLATE_CANDIDATES = ['form_template.pdf', '申請書與收據.pdf'];
const FONT_CANDIDATES = [
  path.join('fonts', 'NotoSansCJKtc-Regular.otf'),
  path.join('fonts', 'NotoSansTC-Regular.otf'),
  path.join('fonts', 'NotoSansCJKtc-Regular.ttf'),
  path.join('fonts', 'NotoSansTC-Regular.ttf'),
];

function findTemplatePath() {
  for (const name of TEMPLATE_CANDIDATES) {
    const p = path.join(ASSETS_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return String(dateStr);
  return d.format('YYYY-MM-DD');
}

/**
 * Generate Application PDF
 * - If a template PDF exists in assets/, draw onto it.
 * - Otherwise, create a new simple PDF with key fields.
 * @param {object} pkg - { application, user, interruption_periods }
 * @param {object} [options]
 * @param {boolean} [options.showReceipt=true] - 是否在最後附上收據頁
 * @param {string} [options.title] - PDF 題名（若未提供則使用預設）
 * @returns {Promise<Buffer>}
 */
async function generateApplicationPdf(pkg, options = {}) {
  const { showReceipt = true, title } = options;
  const templatePath = findTemplatePath();
  let pdfDoc;
  let unicodeFont = null;

  if (templatePath) {
    const bytes = fs.readFileSync(templatePath);
    pdfDoc = await PDFDocument.load(bytes);
  } else {
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
  }

  // Try load CJK font if present
  for (const rel of FONT_CANDIDATES) {
    const p = path.join(ASSETS_DIR, rel);
    if (fs.existsSync(p)) {
      try {
        const fontBytes = fs.readFileSync(p);
        unicodeFont = await pdfDoc.embedFont(fontBytes);
        break;
      } catch (_) {}
    }
  }

  // Metadata
  try {
    const metaTitle = title || '申請書與收據';
    pdfDoc.setTitle(metaTitle);
    if (pkg?.user?.username || pkg?.user?.email) {
      pdfDoc.setAuthor(String(pkg.user.username || pkg.user.email));
    }
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setProducer('innoserve nodejs_app pdfService');
  } catch (_) {}

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const font = unicodeFont || (await pdfDoc.embedFont(StandardFonts.Helvetica));
  const fontBold = unicodeFont || (await pdfDoc.embedFont(StandardFonts.HelveticaBold));

  // If we don't have a unicode-capable font, strip non-ASCII to avoid WinAnsi errors
  const safe = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (unicodeFont) return s;
    return s.replace(/[\u0100-\uffff]/g, '?');
  };

  const left = 50;
  let top = page.getHeight() - 60;
  const line = (key, value) => {
    page.drawText(key + ':', { x: left, y: top, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(String(value ?? ''), { x: left + 160, y: top, size: 12, font, color: rgb(0, 0, 0) });
    top -= 20;
  };

  // Header
  const headerTitle = title ? safe(title) : safe('申請書與收據 (Application & Receipt)');
  page.drawText(headerTitle, { x: left, y: top, size: 16, font: fontBold });
  top -= 30;

  // User Section
  page.drawText(safe('申請人資訊 Applicant'), { x: left, y: top, size: 13, font: fontBold });
  top -= 20;
  line(safe('姓名 Username'), safe(pkg.user?.username));
  line('Email', safe(pkg.user?.email));
  line(safe('身分證號 ID'), safe(pkg.user?.ID_number));
  line(safe('出生日期 DOB'), safe(formatDate(pkg.user?.DOB)));
  line(safe('電話 Phone'), safe(pkg.user?.telephone));
  line(safe('住址 Address'), safe(pkg.user?.useraddress));

  top -= 10;
  page.drawText(safe('申請資料 Application'), { x: left, y: top, size: 13, font: fontBold });
  top -= 20;
  line(safe('申請編號 ID'), safe(pkg.application?.application_id));
  line(safe('請領資格'), safe(pkg.application?.eligibility_criteria));
  line(safe('傷兵類別'), safe(pkg.application?.types_of_wounded));
  line(safe('受傷日期'), safe(formatDate(pkg.application?.injury_date)));
  line(safe('受傷時間'), safe(pkg.application?.injury_time ?? ''));
  line(safe('受傷地點'), safe(pkg.application?.injury_location));
  line(safe('受傷原因'), safe(pkg.application?.injury_cause));
  line(safe('是否復工'), safe(pkg.application?.is_reinstated ? '是' : '否'));
  line(safe('復工日期'), safe(formatDate(pkg.application?.reinstatement_date)));
  line(safe('薪資情形'), safe(pkg.application?.salary_status));
  line(safe('薪資類別'), safe(pkg.application?.salary_type));
  line(safe('傷害類型'), safe(pkg.application?.injury_type));
  line(safe('工作內容'), safe(pkg.application?.work_content));

  if (top < 100) {
    pdfDoc.addPage();
  }

  // Interruption periods table (if any)
  if (pkg.interruption_periods && pkg.interruption_periods.length) {
    const p2 = pdfDoc.getPages()[pdfDoc.getPages().length - 1];
    let y = p2.getHeight() - 60;
  p2.drawText(safe('斷續時間 Interruption Periods'), { x: left, y, size: 13, font: fontBold });
    y -= 20;
    for (const period of pkg.interruption_periods) {
  p2.drawText(safe(`• ${formatDate(period.start_date)} ~ ${formatDate(period.end_date)}`), { x: left, y, size: 12, font });
      y -= 18;
      if (y < 60) {
        pdfDoc.addPage();
        y = p2.getHeight() - 60;
      }
    }
  }

  // Optional receipt page
  if (showReceipt) {
    const receiptPage = pdfDoc.addPage();
    const rLeft = 50;
    let rTop = receiptPage.getHeight() - 60;
    receiptPage.drawText(safe('收據 Receipt'), { x: rLeft, y: rTop, size: 16, font: fontBold });
    rTop -= 30;

    const rLine = (key, value) => {
      receiptPage.drawText(key + ':', { x: rLeft, y: rTop, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      receiptPage.drawText(String(value ?? ''), { x: rLeft + 160, y: rTop, size: 12, font, color: rgb(0, 0, 0) });
      rTop -= 20;
    };

    rLine(safe('申請人'), safe(pkg.user?.username));
    rLine('Email', safe(pkg.user?.email));
    rLine(safe('申請編號'), safe(pkg.application?.application_id));
    rLine(safe('日期'), safe(formatDate(pkg.application?.created_at || new Date())));

    rTop -= 20;
    receiptPage.drawText(safe('備註 Notes:'), { x: rLeft, y: rTop, size: 12, font: fontBold });
    rTop -= 40;
    // 簽名線
    receiptPage.drawText(safe('簽名 Signature:  _______________________________'), { x: rLeft, y: rTop, size: 12, font });
  }

  // Page numbers
  try {
    const pagesAll = pdfDoc.getPages();
    const count = pagesAll.length;
    for (let i = 0; i < count; i++) {
      const p = pagesAll[i];
      const text = safe(`${i + 1} / ${count}`);
      p.drawText(text, { x: p.getWidth() - 60, y: 20, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    }
  } catch (_) {}

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateApplicationPdf,
};
