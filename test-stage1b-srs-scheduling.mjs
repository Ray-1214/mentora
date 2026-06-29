#!/usr/bin/env node
/**
 * test-stage1b-srs-scheduling.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * 驗證階段 1b(SRS 間隔重複)的「選字排程」行為。對應 ROADMAP §8 階段 1b 驗收標準:
 *   (1) 某字答對後,在其 due 日之前不再被選中;到 due 後重新出現。
 *   (2) due 的字優先於未到期的字被選。
 *   (3) 既有 stats 不破壞(無 srs 欄位的舊資料仍可正常選字)。
 *
 * 用法:
 *   1) 放在 repo 根目錄(與 src/ 同層),用 node 直接跑:
 *        node test-stage1b-srs-scheduling.mjs
 *   2) 修改「前」(srs.js 尚未建立)→ 本腳本在載入階段就會以 exit 1 失敗,
 *      訊息為「找不到 src/services/srs.js」。這就是預期的 before 狀態。
 *   3) 修改「後」(Claude Code 完成 1b)→ 應全部 PASS、exit 0。
 *
 * 設計說明:
 *   - 本腳本只 import 純邏輯層:src/services/vocab.js(選字)與 src/services/srs.js
 *     (排程)。storage.js 因在 module top-level 觸碰 window/localStorage,無法在
 *     node 載入,故不 import;改用本檔的 reviewCorrect/reviewWrong 以「真正的」
 *     srs.js 函式(nextBox / dueFromBox)模擬 updateWordStats 對 srs 欄位的寫入。
 *   - 時鐘以固定 now 注入 selectAnswerWords({ now }),所以不需要真的等待天數。
 *   - 斷言不寫死任何間隔天數,一律從 srs.js 的 SRS_INTERVALS_DAYS 推導,因此調整
 *     間隔階梯不會使本腳本失準。
 */

import { selectAnswerWords } from './src/services/vocab.js';

let srs;
try {
  srs = await import('./src/services/srs.js');
} catch (e) {
  console.error('FAIL: 找不到 src/services/srs.js — 階段 1b 尚未實作(這是修改前的預期失敗)。');
  console.error('       ' + e.message);
  process.exit(1);
}

const { SRS_INTERVALS_DAYS, nextBox, dueFromBox, isDue } = srs;
for (const [name, fn] of [['nextBox', nextBox], ['dueFromBox', dueFromBox], ['isDue', isDue]]) {
  if (typeof fn !== 'function') {
    console.error(`FAIL: srs.js 未匯出 ${name}()。`);
    process.exit(1);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1); // 固定的假時鐘原點

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`);
    failures++;
  }
}
function section(title) { console.log('\n' + title); }

// ── helpers ───────────────────────────────────────────────────────────────────
function makeBank(n) {
  return Array.from({ length: n }, (_, i) => ({ word: `w${i}`, frequency_tier: (i % 3) + 1 }));
}
function ensure(stats, w, now) {
  const k = w.toLowerCase();
  if (!stats[k]) {
    stats[k] = {
      option_appearance_count: 0, consecutive_corrects: 0, times_as_answer: 0,
      mastered: false, last_seen: now, srs_box: 0,
    };
  }
  return stats[k];
}
// 模擬 updateWordStats 對「答案字」的 srs 寫入,使用真正的 srs.js 函式。
function reviewCorrect(stats, w, now) {
  const s = ensure(stats, w, now);
  s.times_as_answer += 1; s.consecutive_corrects += 1; s.last_seen = now;
  s.srs_box = nextBox(s.srs_box, true);
  s.srs_due = dueFromBox(s.srs_box, now);
}
function reviewWrong(stats, w, now) {
  const s = ensure(stats, w, now);
  s.times_as_answer += 1; s.consecutive_corrects = 0; s.last_seen = now;
  s.srs_box = nextBox(s.srs_box, false);
  s.srs_due = dueFromBox(s.srs_box, now);
}

// ── T1: srs.js 階梯與狀態轉移(單元) ─────────────────────────────────────────
section('T1 — srs.js ladder & transitions');
{
  let stepOk = true, box = 0;
  for (let i = 1; i < SRS_INTERVALS_DAYS.length; i++) {
    box = nextBox(box, true);
    if (box !== i) stepOk = false;
  }
  check('連續答對:box 逐格遞增', stepOk);
  check('box 在最高格夾住(不溢位)',
    nextBox(SRS_INTERVALS_DAYS.length - 1, true) === SRS_INTERVALS_DAYS.length - 1);
  check('答錯:box 歸 0', nextBox(5, false) === 0);
  check('dueFromBox = now + 間隔(天)',
    dueFromBox(2, T0) === T0 + SRS_INTERVALS_DAYS[2] * DAY_MS);
  check('isDue: srs_due 為 null/undefined 視為到期', isDue(null, T0) === true && isDue(undefined, T0) === true);
  check('isDue: 已過期 → true', isDue(T0 - 1, T0) === true);
  check('isDue: 未到期 → false', isDue(T0 + 1, T0) === false);
}

// ── T2: due 充足時,not-due 永不被選(驗收標準 2) ──────────────────────────────
section('T2 — due 優先:due 充足時 not-due 不被選');
{
  const count = 3, draws = 300;
  const bank = makeBank(10);
  const stats = {};
  // 前 5 個:無 stats → 視為到期(due)。後 5 個:srs_due 設在未來 → not-due。
  for (let i = 5; i < 10; i++) ensure(stats, bank[i].word, T0).srs_due = T0 + 10 * DAY_MS;
  const dueSet = new Set(bank.slice(0, 5).map(w => w.word));

  let leaked = 0;
  for (let d = 0; d < draws; d++) {
    const pick = selectAnswerWords(bank, stats, count, { now: T0 });
    for (const w of pick) if (!dueSet.has(w.word)) leaked++;
  }
  check(`${draws} 次抽樣:not-due 出現 0 次`, leaked === 0, `leaked=${leaked}`);
}

// ── T3: due 不足時,由 not-due 補足(fallback,不破壞批量大小) ────────────────
section('T3 — due 不足時由 not-due 補足');
{
  const count = 5, draws = 300;
  const bank = makeBank(10);
  const stats = {};
  // 只有 2 個 due,其餘 8 個 not-due。
  for (let i = 2; i < 10; i++) ensure(stats, bank[i].word, T0).srs_due = T0 + 10 * DAY_MS;
  const dueSet = new Set(bank.slice(0, 2).map(w => w.word));

  let everyBatchHasAllDue = true, everyBatchFull = true;
  for (let d = 0; d < draws; d++) {
    const pick = selectAnswerWords(bank, stats, count, { now: T0 });
    if (pick.length !== count) everyBatchFull = false;
    const names = new Set(pick.map(w => w.word));
    for (const dw of dueSet) if (!names.has(dw)) everyBatchHasAllDue = false;
  }
  check('每批都先取盡全部 due 字', everyBatchHasAllDue);
  check('每批由 not-due 補滿至 count', everyBatchFull);
}

// ── T4: 答對後,due 之前不再被選(驗收標準 1,前半) ───────────────────────────
section('T4 — 答對後 due 之前不再被選');
{
  const count = 5, draws = 300;
  const bank = makeBank(10);            // W = bank[0];其餘 9 個未碰 → 永遠 due
  const stats = {};
  reviewCorrect(stats, bank[0].word, T0); // W → box 1,due = T0 + 1 天
  const wDue = stats['w0'].srs_due;
  check('答對後 W 取得未來 due', wDue > T0);

  let wSeen = 0;
  for (let d = 0; d < draws; d++) {
    const now = T0 + Math.floor(Math.random() * (wDue - T0)); // due 之前的任一時點
    const pick = selectAnswerWords(bank, stats, count, { now });
    if (pick.some(w => w.word === 'w0')) wSeen++;
  }
  check(`due 之前 ${draws} 次抽樣:W 出現 0 次`, wSeen === 0, `wSeen=${wSeen}`);
}

// ── T5: 到 due 後 W 重新可被選(驗收標準 1,後半) ────────────────────────────
section('T5 — 到期後 W 重新可被選');
{
  const count = 5, draws = 400;
  const bank = makeBank(10);
  const stats = {};
  reviewCorrect(stats, bank[0].word, T0); // box 1,due = T0 + 1 天
  const wDue = stats['w0'].srs_due;

  let wSeen = 0;
  for (let d = 0; d < draws; d++) {
    const pick = selectAnswerWords(bank, stats, count, { now: wDue }); // 剛好到期
    if (pick.some(w => w.word === 'w0')) wSeen++;
  }
  // 機率性斷言:W 權重雖較低,但 400 次未中的機率約 e^-50 量級,實務上必中。
  check(`到期後 ${draws} 次抽樣:W 至少出現一次`, wSeen > 0, `wSeen=${wSeen}/${draws}`);
}

// ── T6: 答錯歸第 0 格、立即(或最短間隔)到期 ────────────────────────────────
section('T6 — 答錯歸第 0 格、最短間隔到期');
{
  const stats = {};
  reviewCorrect(stats, 'w', T0);
  reviewCorrect(stats, 'w', T0 + 1 * DAY_MS);
  reviewCorrect(stats, 'w', T0 + 3 * DAY_MS);
  check('連對後 box 前進(≥2)', stats['w'].srs_box >= 2);

  const tWrong = T0 + 10 * DAY_MS;
  reviewWrong(stats, 'w', tWrong);
  check('答錯後 box 歸 0', stats['w'].srs_box === 0);
  check('答錯後在最短間隔內到期',
    isDue(stats['w'].srs_due, tWrong + SRS_INTERVALS_DAYS[0] * DAY_MS) === true);
}

// ── T7: 舊資料(無 srs 欄位)相容(驗收標準 3) ──────────────────────────────
section('T7 — 舊資料(無 srs 欄位)相容');
{
  const count = 3;
  const bank = makeBank(6);
  const stats = {};
  // 模擬 1a 時代的舊 stats:有舊欄位,但完全沒有 srs_box / srs_due。
  for (const w of bank) {
    stats[w.word.toLowerCase()] = {
      option_appearance_count: 2, consecutive_corrects: 1, times_as_answer: 1,
      mastered: false, last_seen: T0,
    };
  }
  let ok = true;
  try {
    for (let d = 0; d < 50; d++) {
      const pick = selectAnswerWords(bank, stats, count, { now: T0 });
      if (pick.length !== count) ok = false;
    }
  } catch (e) {
    ok = false;
  }
  check('無 srs 欄位時:選字不報錯、舊資料視為到期', ok);
}

console.log('\n' + (failures === 0 ? 'ALL PASS ✅' : `${failures} FAIL ❌`));
process.exit(failures === 0 ? 0 : 1);
