/**
 * test-w8-part5-priority-scope.mjs — W8 修正:Part 5 priorityWords 必須在 custom scope 下存活。
 *
 * BUG(修前,CLAUDE.md §5):
 *   Main quiz 分支以 selectAnswerWords(examBank.filter(topic), stats, 10, { exam }) 組 priorityWords,
 *   即使 examBank 已 scope-resolved 仍傳 UI 的 `exam`。custom 表下 examBank = [...匯入字](exam 過濾
 *   已刻意關閉)但 exam 仍是 'TOEIC',於是 selectAnswerWords 又用 w.exams.includes('TOEIC') 過濾;
 *   匯入字帶 exams:[] → 池被清空 → priorityWords 退化成僅 weakWords.slice(0,5)(不 crash,但主題字消失)。
 *
 * FIX:
 *   priorityWords 組裝抽成純函式 selectPriorityWords(bank, stats, { weakWords, topics, count, cap })
 *   於 src/services/vocab.js,不收 exam(bank 為權威)。Main 以 scope-resolved 的 examBank 呼叫之。
 *
 * 斷言:
 *   T0  地雷屬實:selectAnswerWords 帶 { exam } 對 exams:[] 的 custom 池會清空。
 *   T1  custom scope 下 selectPriorityWords 回傳「非空、且全為 custom 字」。
 *   T2  weak 字在場 + 至少一個匯入主題字在場;len <= cap。
 *   T3  built-in 對照:帶 exams 的字仍正常選出(修正未破壞正常路徑)。
 *   T4  去重:同時在 weakWords 與 bank 的字只出現一次。
 *
 * RED/GREEN:
 *   抽出前 selectPriorityWords 未匯出 → import 拋錯 → FAIL;抽出 + Main 接線後 → PASS。
 *
 * RUN:  node test-w8-part5-priority-scope.mjs   (repo 根;exit 0 過 / 1 掛)
 */
import { selectAnswerWords, selectPriorityWords } from './src/services/vocab.js';

const NOW = Date.UTC(2026, 0, 1);
let ok = true;
const fail = (m) => { console.error('  FAIL: ' + m); ok = false; };

// ── fixtures ──────────────────────────────────────────────────────────────────
// custom 表:匯入字。關鍵地雷屬性 → exams: []（undefined 也會被同樣過濾掉，行為一致）。
const customBank = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel']
  .map((w, i) => ({ id:`imp_${i+1}`, word:w, category:'business', meaning_zh:`中文${i+1}`, frequency_tier:2, exams:[] }));

// built-in 形狀:帶 exam 的字。
const builtinBank = ['audit','ledger','invoice','revenue','merger','asset','fiscal','equity']
  .map((w, i) => ({ id:`bi_${i+1}`, word:w, category:'business', meaning_zh:`會計${i+1}`, frequency_tier:2, exams:['TOEIC'] }));

const TOPICS = ['business'];
const STATS  = {};
const customWords = new Set(customBank.map(w => w.word));

console.log('W8 — Part 5 priorityWords survives custom scope');

// ── T0:地雷確實清空池 ────────────────────────────────────────────────────────
const hazard = selectAnswerWords(customBank.filter(w => TOPICS.includes(w.category)), STATS, 10, { exam:'TOEIC', now:NOW });
console.log(`  T0 hazard   selectAnswerWords(..., { exam }) on exams:[] pool → ${hazard.length} (expect 0)`);
if (hazard.length !== 0) fail('exam 過濾未清空 custom 池 — fixture 已無法重現 bug');

// ── T1:custom scope,無 weak → 非空、全為 custom 字 ─────────────────────────────
const t1 = selectPriorityWords(customBank, STATS, { weakWords:[], topics:TOPICS, count:10, cap:12 });
console.log(`  T1 custom   priorityWords = ${t1.length} (expect > 0)，且全為 custom 字`);
if (t1.length === 0) fail('custom scope 下 priorityWords 被清空(匯入字被丟掉)');
if (!t1.every(w => customWords.has(w))) fail('priorityWords 含非 custom 表的字');

// ── T2:custom + weak → weak 在場、匯入字在場、有 cap ─────────────────────────────
const WEAK = ['zeta','eta']; // 不在 customBank
const t2 = selectPriorityWords(customBank, STATS, { weakWords:WEAK, topics:TOPICS, count:10, cap:12 });
const weakPresent = WEAK.every(w => t2.includes(w));
const importedPresent = t2.some(w => customWords.has(w));
console.log(`  T2 c+weak   weakPresent=${weakPresent} importedPresent=${importedPresent} len=${t2.length} (expect true/true/<=12)`);
if (!weakPresent) fail('weak 字未出現在 priorityWords');
if (!importedPresent) fail('weak 字旁沒有任何匯入主題字');
if (t2.length > 12) fail(`超過 cap:${t2.length} > 12`);

// ── T3:built-in 對照 → 仍能選出 ────────────────────────────────────────────────
const t3 = selectPriorityWords(builtinBank, STATS, { weakWords:[], topics:TOPICS, count:10, cap:12 });
const allBuiltin = t3.every(w => builtinBank.some(b => b.word === w));
console.log(`  T3 builtin  priorityWords = ${t3.length} (expect > 0)，且全為 built-in 字`);
if (t3.length === 0) fail('built-in 對照被清空(正常路徑退化)');
if (!allBuiltin) fail('built-in priorityWords 含非預期字');

// ── T4:去重 ──────────────────────────────────────────────────────────────────
const dup = customBank[0].word; // 'alpha'
const t4 = selectPriorityWords(customBank, STATS, { weakWords:[dup], topics:TOPICS, count:10, cap:12 });
const n = t4.filter(w => w === dup).length;
console.log(`  T4 dedup    '${dup}' 出現 ${n} 次 (expect 1)`);
if (n !== 1) fail(`去重失敗:'${dup}' 出現 ${n} 次`);

console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);