#!/usr/bin/env node
/**
 * test-b8-part6-options.mjs — B8 guard
 *
 * 驗證:Part 6 的選項必須在 Main 的資料準備階段 shuffle 一次,
 *      渲染元件不得在 render body 內重新亂數排序(否則點選項時選項會重排 = 畫面「跳位」)。
 *
 * 用法(repo 根目錄):
 *   node scripts/test-b8-part6-options.mjs
 *
 * 預期:
 *   修改前 = FAIL(Part6Quiz 內 getOpts() / Math.random 命中)
 *   修改後 = PASS
 *
 * 純靜態原始碼檢查:不啟動 app、不呼叫 LLM、不需 build。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const at = (p) => resolve(ROOT, p);

const PART6_PATH = 'src/components/Part6Quiz/index.js';
const MAIN_PATH  = 'src/components/Main/index.js';

let fail = 0, warned = 0;
const ok   = (m)    => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad  = (m, d) => { console.log(`  \x1b[31m✗\x1b[0m ${m}${d ? `\n      ${d}` : ''}`); fail++; };
const warn = (m, d) => { console.log(`  \x1b[33m⚠\x1b[0m ${m}${d ? `\n      ${d}` : ''}`); warned++; };
const check = (cond, m, d) => (cond ? ok(m) : bad(m, d));

function read(p) {
  const f = at(p);
  if (!existsSync(f)) { console.error(`FATAL: 找不到 ${p}(請在 repo 根目錄執行)`); process.exit(2); }
  return readFileSync(f, 'utf8');
}
function walkJs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJs(p, out);
    else if (/\.(js|mjs|jsx)$/.test(p) && !/\.stories\.js$/.test(p)) out.push(p);
  }
  return out;
}
function hits(src, re) {
  const out = [];
  const lines = src.split('\n');
  lines.forEach((l, i) => { if (re.test(l)) out.push(`${i + 1}| ${l.trim()}`); re.lastIndex = 0; });
  return out;
}
/** 從 `mode === 'X'` 起,切到下一個 else-if 分支為止 */
function branchOf(main, mode) {
  const start = main.indexOf(`mode === '${mode}'`);
  if (start < 0) return null;
  const after = main.slice(start);
  const next = after.indexOf('else if (mode ===', 5);
  return next > 0 ? after.slice(0, next) : after.slice(0, 1500);
}

const part6 = read(PART6_PATH);
const main  = read(MAIN_PATH);

console.log('\n=== B8 · Part 6 選項穩定性 ===\n');

console.log('[1] 渲染元件不得在 render 內產生隨機性');
{
  const h = hits(part6, /Math\.random/);
  check(h.length === 0, `${PART6_PATH} 無 Math.random`, h.join('\n      '));
}
{
  const h = hits(part6, /getOpts/);
  check(h.length === 0, `${PART6_PATH} 已移除 getOpts()`, h.join('\n      '));
}
{
  const h = hits(part6, /\.sort\(/);
  check(h.length === 0, `${PART6_PATH} 無 .sort( 呼叫`, h.join('\n      '));
}
check(/q\.options/.test(part6), `${PART6_PATH} 直接讀 q.options`);

console.log('\n[2] Main 的 part6 分支必須預先備妥 options');
{
  const b = branchOf(main, 'part6');
  check(!!b, "Main 內找得到 mode === 'part6' 分支");
  if (b) {
    check(/options:\s*shuffle\(/.test(b), 'part6 分支含 options: shuffle(...)',
      b.split('\n').slice(0, 12).map((l, i) => `${i}| ${l.trim()}`).join('\n      '));
    check(/questions/.test(b) && /\.map\(/.test(b), 'part6 分支對 data.questions 做 map');
  }
}

console.log('\n[3] 四個 LLM 模式一致性(回歸護欄)');
for (const m of ['quiz', 'part6', 'part7', 'vocab']) {
  const b = branchOf(main, m);
  check(!!b && /options:/.test(b), `${m} 分支在進入渲染元件前已設定 options`);
}

console.log('\n[4] 全 src/ 不得有比較器式洗牌(有偏 + 不一致比較器)');
{
  const NAIVE = /\.sort\(\s*\([^)]*\)\s*=>[^;\n]*Math\.random/;
  const bads = [];
  for (const f of walkJs(at('src'))) {
    const h = hits(readFileSync(f, 'utf8'), NAIVE);
    if (h.length) bads.push(`${f.replace(ROOT + '/', '').replace(ROOT + '\\', '')}\n        ${h.join('\n        ')}`);
  }
  check(bads.length === 0, '無 arr.sort(() => Math.random() - 0.5) 式洗牌', bads.join('\n      '));
}

console.log('\n[5] 兄弟元件掃描(僅警告,不影響結果)');
for (const f of walkJs(at('src/components'))) {
  const short = f.replace(ROOT + '/', '').replace(ROOT + '\\', '');
  if (short.includes('Main')) continue;               // Main 是資料準備層,允許隨機
  const h = hits(readFileSync(f, 'utf8'), /Math\.random/);
  if (h.length) warn(`${short} 的 render 層出現 Math.random(請人工確認是否同類 bug)`, h.join('\n      '));
}

console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${fail} 項失敗、${warned} 項警告 ===\n`);
process.exit(fail === 0 ? 0 : 1);