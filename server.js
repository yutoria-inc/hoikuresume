const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();

// viewエンジン設定（EJS）
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// POSTデータ取得用
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル
app.use(express.static(path.join(__dirname, 'public')));

// ✅ フォント静的配信（/fonts/... でアクセスできる）
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

// 日付を「2025年11月30日現在」形式にする
function formatJapaneseDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日現在`;
}

app.get('/', (req, res) => res.render('index'));
app.get('/resume', (req, res) => res.render('resume'));
app.get('/career', (req, res) => res.render('career'));

app.post('/career/preview', (req, res) => {
  res.render('career-preview', { data: req.body });
});

app.post('/generate', (req, res) => {
  const {
    name,
    furigana,
    email,
    phone,
    address,
    birth,
    desiredPosition,
    experience,
    prText,
  } = req.body;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const fontPath = path.join(__dirname, 'fonts', 'NotoSansJP-Regular.ttf');
  let mainFont = 'Helvetica';
  if (fs.existsSync(fontPath)) {
    doc.registerFont('jp', fontPath);
    mainFont = 'jp';
  }
  doc.font(mainFont);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="hoikushi-resume.pdf"');

  doc.pipe(res);

  doc.fontSize(20).text('履　歴　書', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(formatJapaneseDate(new Date()), { align: 'right' });

  doc.moveDown(0.3);
  const lineLeft = doc.page.margins.left;
  const lineRight = doc.page.width - doc.page.margins.right;
  const yLine = doc.y;
  doc.moveTo(lineLeft, yLine).lineTo(lineRight, yLine).lineWidth(0.7).stroke();

  doc.moveDown(0.8);

  const labeledLine = (label, value) => {
    doc.fontSize(11).text(`${label}　${value || ''}`);
  };

  const sectionHeading = (title) => {
    doc.moveDown(0.8);
    doc.fontSize(12).text(title);
    const y = doc.y + 2;
    doc.moveTo(lineLeft, y).lineTo(lineRight, y).lineWidth(0.6).stroke();
    doc.moveDown(0.4);
  };

  sectionHeading('基本情報');
  labeledLine('氏名', name);
  labeledLine('ふりがな', furigana);

  let birthStr = '';
  if (birth) {
    const d = new Date(birth);
    birthStr = !isNaN(d.getTime())
      ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
      : birth;
  }
  labeledLine('生年月日', birthStr);

  labeledLine('住所', address);
  labeledLine('電話番号', phone);
  labeledLine('メールアドレス', email);

  sectionHeading('職歴・保育経験');
  if (desiredPosition) labeledLine('希望職種・勤務形態', desiredPosition);

  if (experience && experience.trim()) {
    doc.fontSize(11).text(experience, { lineGap: 2 });
  } else {
    doc.fontSize(11).fillColor('#888888')
      .text('（ここにこれまでの保育園・勤務経験を記入）')
      .fillColor('#000000');
  }

  sectionHeading('志望動機・自己PR等');
  if (prText && prText.trim()) {
    doc.fontSize(11).text(prText, { lineGap: 2 });
  } else {
    doc.fontSize(11).fillColor('#888888')
      .text('（ここに応募先への志望動機や自己PRを記入）')
      .fillColor('#000000');
  }

  sectionHeading('本人希望記入欄');
  doc.fontSize(11).fillColor('#888888')
    .text('（勤務時間・通勤時間・扶養内勤務希望などがあれば記入）', { lineGap: 2 })
    .fillColor('#000000');

  doc.moveDown(3);
  doc.end();
});

// ✅ ローカルだけ listen
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server started on http://localhost:${port}`));
}

module.exports = app;
