const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generateDocs() {
  const rootDir = process.cwd();
  
  // 1. メモ用JSONの読み込み
  const memoPath = path.join(rootDir, 'spec_memo.json');
  if (!fs.existsSync(memoPath)) {
    console.error('エラー: spec_memo.json が見つかりません。');
    return;
  }
  const memo = JSON.parse(fs.readFileSync(memoPath, 'utf8'));

  // 2. Excelブックの作成
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Testers Field';
  workbook.created = new Date();

  // --- シート1: 基本情報＆重要ルール ---
  const sheet1 = workbook.addWorksheet('基本仕様');
  sheet1.columns = [
    { header: '項目', key: 'key', width: 25 },
    { header: '内容', key: 'val', width: 60 },
  ];
  sheet1.addRow({ key: 'プロジェクト名', val: memo.project_name });
  sheet1.addRow({ key: 'バージョン', val: memo.version });
  sheet1.addRow({ key: '更新日', val: memo.updated_at });
  sheet1.addRow({ key: '技術スタック', val: Object.entries(memo.tech_stack).map(([k, v]) => `${k}: ${v}`).join(' / ') });
  sheet1.addRow({ key: '募集枠 / 必要Pt', val: `${memo.core_rules.fixed_testers}人固定 / ${memo.core_rules.cost_per_app}pt` });
  sheet1.addRow({ key: '1件あたりの報酬', val: `${memo.core_rules.reward_per_test}pt` });
  sheet1.addRow({ key: 'フィードバック制限', val: `各項目 ${memo.core_rules.feedback_min_chars}文字以上` });
  sheet1.addRow({ key: '公式Googleグループ', val: memo.core_rules.google_group_url });

  // --- シート2: 実装済み仕様 & 今後の修正案 ---
  const sheet2 = workbook.addWorksheet('機能仕様と修正案');
  sheet2.columns = [
    { header: '区分', key: 'type', width: 20 },
    { header: '内容', key: 'content', width: 65 },
  ];
  memo.important_specs.forEach((item) => sheet2.addRow({ type: '実装済み重要機能', content: item }));
  memo.future_enhancements.forEach((item) => sheet2.addRow({ type: '今後の修正・改善案', content: item }));

  // --- シート3: 収益化計画 & マーケティング ---
  const sheet3 = workbook.addWorksheet('収益化・マーケ計画');
  sheet3.columns = [
    { header: '項目', key: 'type', width: 25 },
    { header: '戦略・計画内容', key: 'content', width: 65 },
  ];
  memo.monetization_plan.forEach((item) => sheet3.addRow({ type: '収益化施策', content: item }));
  sheet3.addRow({ type: '動画マーケティング', content: memo.marketing_strategy.short_form_video });
  sheet3.addRow({ type: 'SNS直接アプローチ', content: memo.marketing_strategy.direct_approach });

  // 見出し行の装飾
  [sheet1, sheet2, sheet3].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  });

  const outputPath = path.join(rootDir, '仕様書_テスターズフィールド.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ 仕様書が正常に生成されました: ${outputPath}`);
}

generateDocs();
