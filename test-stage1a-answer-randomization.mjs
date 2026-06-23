// test-stage1a-answer-randomization.mjs
// ===========================================================================
// 目的：驗證 selectAnswerWords() 的「單字由上往下出 + 單調」是否修好。
//
// 用法：
//   1. 把本檔放在 repo 根目錄（與 src/ 同層）。放 scripts/ 也行，腳本會自己找。
//   2. 在 repo 根目錄執行：
//        node test-stage1a-answer-randomization.mjs
//   3. 可選參數：
//        node test-stage1a-answer-randomization.mjs --exam=TOEIC --count=10 --runs=200
//      （--exam 不給 = 不分考試、用整個字庫，bug 最明顯）
//
// 怎麼判讀：
//   - 「套用 Claude Code 修改之前」先跑一次 → 預期顯示 DETERMINISTIC ❌（重現 bug）。
//   - 套用修改後再跑一次          → 預期顯示 RANDOMIZED ✅（修好）。
//   - 兩次都會印出各 frequency_tier 的被選比例，確認「教學優先序」沒被破壞
//     （tier 1 應該被選最多）。
//
// 原理：本腳本載入「真正的」src/services/vocab.js（複製成暫存 .mjs 再 import，
//       繞過 CRA 的 CommonJS 模組判定），所以測的是實際程式，不是副本。
//       只需要 Node 18+，不需安裝任何套件。
// ===========================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 參數 ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);
const EXAM  = args.exam === undefined ? null : args.exam; // 預設 null = 不分考試
const COUNT = parseInt(args.count ?? '10', 10);
const RUNS  = parseInt(args.runs ?? '200', 10);

// ── 小工具：在多個候選路徑中找第一個存在的 ──────────────────────────────────
function resolveFirst(candidates) {
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

// ── 載入真正的 vocab.js（複製成暫存 .mjs 再 import）────────────────────────
const vocabPath = resolveFirst([
  join(__dirname, 'src', 'services', 'vocab.js'),
  join(__dirname, '..', 'src', 'services', 'vocab.js'),
]);
if (!vocabPath) {
  console.error('✗ 找不到 src/services/vocab.js');
  console.error('  請把本檔放在 repo 根目錄（與 src/ 同層）後再執行。');
  process.exit(1);
}
const tmpFile = join(tmpdir(), `vocab-test-${Date.now()}.mjs`);
writeFileSync(tmpFile, readFileSync(vocabPath, 'utf8'));
const { selectAnswerWords } = await import(pathToFileURL(tmpFile).href);

if (typeof selectAnswerWords !== 'function') {
  console.error('✗ vocab.js 沒有匯出 selectAnswerWords，請確認檔案內容。');
  process.exit(1);
}

// ── 載入單字庫（優先用真實 vocab.json，否則用合成資料）─────────────────────
function loadBank() {
  const real = resolveFirst([
    join(__dirname, 'src', 'data', 'vocab.json'),
    join(__dirname, '..', 'src', 'data', 'vocab.json'),
  ]);
  if (real) {
    const data = JSON.parse(readFileSync(real, 'utf8'));
    const bank = Array.isArray(data) ? data : (data.words || data.vocab || []);
    if (bank.length) return { bank, source: real };
  }
  // 合成 fallback：600 字，三個 tier 各 200，分散在各考試
  const exams = ['TOEIC', 'TOEFL', 'IELTS', '學測'];
  const bank = [];
  for (let i = 0; i < 600; i++) {
    bank.push({
      id: i,
      word: `word${i}`,
      pos: 'n.',
      frequency_tier: (i % 3) + 1,
      exams: [exams[i % exams.length]],
    });
  }
  return { bank, source: '(合成資料 — 找不到 src/data/vocab.json)' };
}
const { bank, source } = loadBank();

// 重現函式內部的 pool 過濾，方便報告 pool 大小
const pool = EXAM ? bank.filter(w => w.exams && w.exams.includes(EXAM)) : bank;
if (pool.length === 0) {
  console.error(`✗ 過濾後 pool 是空的（exam=${EXAM}）。換一個 --exam 再試。`);
  process.exit(1);
}

// ── 跑測試：每次都用「全新使用者」（stats 全空）抽 COUNT 個 ─────────────────
const runsSelected = [];   // 每次選到的 word 字串陣列
const tierTally = {};      // frequency_tier -> 被選次數

for (let r = 0; r < RUNS; r++) {
  const stats = {};        // 全新使用者
  const picked = selectAnswerWords(bank, stats, COUNT, { exam: EXAM });
  runsSelected.push(picked.map(w => w.word));
  for (const w of picked) {
    const t = w.frequency_tier || 3;
    tierTally[t] = (tierTally[t] || 0) + 1;
  }
}

// ── 指標 ──────────────────────────────────────────────────────────────────
const union = new Set(runsSelected.flat());
const distinct = union.size;
const firstRun = runsSelected[0].join(',');
const identicalRuns = runsSelected.every(ws => ws.join(',') === firstRun);

// ── 報告 ──────────────────────────────────────────────────────────────────
const line = '─'.repeat(62);
console.log(line);
console.log('selectAnswerWords 隨機化驗證');
console.log(line);
console.log(`單字庫來源 : ${source}`);
console.log(`考試過濾   : ${EXAM ?? '(不分考試，整個字庫)'}`);
console.log(`pool 大小  : ${pool.length} 字`);
console.log(`每次抽取   : ${COUNT} 字   重複次數 : ${RUNS}`);
console.log(line);
console.log(`跨 ${RUNS} 次共出現的不同單字數 : ${distinct}`);
console.log(`每次選的字完全相同？           : ${identicalRuns ? '是' : '否'}`);
console.log(line);

const totalPicks = RUNS * COUNT;
console.log('各 frequency_tier 被選比例（tier 1 應最高 = 教學優先序）：');
Object.keys(tierTally).sort().forEach(t => {
  const pct = ((tierTally[t] / totalPicks) * 100).toFixed(1);
  console.log(`  tier ${t} : ${pct.padStart(5)}%  (${tierTally[t]})`);
});
console.log(line);

// ── 判定 ──────────────────────────────────────────────────────────────────
const deterministic = identicalRuns || distinct <= COUNT;
if (deterministic) {
  console.log('結果：DETERMINISTIC ❌');
  console.log('每次（幾乎）都選到同一批字 →「由上往下 / 單調」bug 仍在。');
  console.log('（若這是套用修改「之前」跑的，這正是預期結果。）');
} else {
  console.log('結果：RANDOMIZED ✅');
  console.log(`同條件下選字會變化（共 ${distinct} 種不同單字），且仍偏向高優先 tier。`);
  console.log('→ 階段 1a 修復生效。');
}
console.log(line);
