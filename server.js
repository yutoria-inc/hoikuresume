// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// viewエンジン設定（EJS）
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// POSTデータ取得用
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル（CSSなど入れたくなったとき用）
app.use(express.static(path.join(__dirname, 'public')));

// 日付を「2025年11月30日現在」みたいな形式にするヘルパー
function formatJapaneseDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日現在`;
}

// フォーム表示 じゃなくて トップページ表示に変更
app.get('/', (req, res) => {
  res.render('index');
});

// 履歴書作成ページ
app.get('/resume', (req, res) => {
  res.render('resume');
});

// 職務経歴書作成ページ
app.get('/career', (req, res) => {
  res.render('career'); // views/career.ejs を表示
});

// 職務経歴書プレビュー用（HTMLで一旦確認するなら）
app.post('/career/preview', (req, res) => {
  // ここで req.body をビューに渡す
  res.render('career-preview', { data: req.body });
  // ↑ まだ career-preview.ejs 作ってないので、後で用意する想定
});

// PDF生成＆ダウンロード（JIS履歴書っぽいレイアウト）
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

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  // 日本語表示用フォントがあれば使う（./fonts/NotoSansJP-Regular.ttf を置いておく想定）
  const fontPath = path.join(__dirname, 'fonts', 'NotoSansJP-Regular.ttf');
  let mainFont = 'Helvetica';
  try {
    if (fs.existsSync(fontPath)) {
      doc.registerFont('jp', fontPath);
      mainFont = 'jp';
    }
  } catch (e) {
    // フォントがなくても落ちないようにする
  }
  doc.font(mainFont);

  // PDFレスポンスヘッダ
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="hoikushi-resume.pdf"'
  );

  doc.pipe(res);

  // ───────── ヘッダ（タイトル＋日付） ─────────
  doc.fontSize(20).text('履　歴　書', {
    align: 'center',
  });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .text(formatJapaneseDate(new Date()), { align: 'right' });

  // タイトル下のライン
  doc.moveDown(0.3);
  const lineLeft = doc.page.margins.left;
  const lineRight = doc.page.width - doc.page.margins.right;
  const yLine = doc.y;
  doc
    .moveTo(lineLeft, yLine)
    .lineTo(lineRight, yLine)
    .lineWidth(0.7)
    .stroke();

  doc.moveDown(0.8);

  // 小さいラベル＋テキストを書くヘルパー
  const labeledLine = (label, value) => {
    doc
      .fontSize(11)
      .text(`${label}　${value || ''}`, { continued: false });
  };

  // セクションタイトル（下に太線）
  const sectionHeading = (title) => {
    doc.moveDown(0.8);
    doc.fontSize(12).text(title, { align: 'left' });
    const y = doc.y + 2;
    doc
      .moveTo(lineLeft, y)
      .lineTo(lineRight, y)
      .lineWidth(0.6)
      .stroke();
    doc.moveDown(0.4);
  };

  // ───────── 基本情報 ─────────
  sectionHeading('基本情報');

  labeledLine('氏名', name);
  labeledLine('ふりがな', furigana);

  // 生年月日だけ少しフォーマット
  let birthStr = '';
  if (birth) {
    const d = new Date(birth);
    if (!isNaN(d.getTime())) {
      birthStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } else {
      birthStr = birth;
    }
  }
  labeledLine('生年月日', birthStr);

  labeledLine('住所', address);
  labeledLine('電話番号', phone);
  labeledLine('メールアドレス', email);

  // ───────── 職歴・保育経験 ─────────
  sectionHeading('職歴・保育経験');

  if (desiredPosition) {
    labeledLine('希望職種・勤務形態', desiredPosition);
    doc.moveDown(0.4);
  }

  if (experience && experience.trim().length > 0) {
    doc.fontSize(11).text(experience, {
      align: 'left',
      lineGap: 2,
    });
  } else {
    doc
      .fontSize(11)
      .fillColor('#888888')
      .text('（ここにこれまでの保育園・勤務経験を記入）', {
        align: 'left',
      })
      .fillColor('#000000');
  }

  // ───────── 自己PR・志望動機 ─────────
  sectionHeading('志望動機・自己PR等');

  if (prText && prText.trim().length > 0) {
    doc.fontSize(11).text(prText, {
      align: 'left',
      lineGap: 2,
    });
  } else {
    doc
      .fontSize(11)
      .fillColor('#888888')
      .text('（ここに応募先への志望動機や自己PRを記入）', {
        align: 'left',
      })
      .fillColor('#000000');
  }

  // ───────── 本人希望記入欄（空欄だけ用意） ─────────
  sectionHeading('本人希望記入欄');

  doc
    .fontSize(11)
    .fillColor('#888888')
    .text('（勤務時間・通勤時間・扶養内勤務希望などがあれば記入）', {
      align: 'left',
      lineGap: 2,
    })
    .fillColor('#000000');

  // 下に余白を作るだけ
  doc.moveDown(3);

  doc.end();
});

// サーバー起動
// ローカル開発のときだけポートを開く
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
}

// Vercel 用に handler として app をエクスポート
module.exports = app;
