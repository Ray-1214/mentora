/**
 * test-w8-rename-clean.mjs — W8 改名 guard:斷言 code/build/config 已無舊「產品名」殘留。
 *
 * 範圍 / 排除
 *   - 以 `git grep` 掃 tracked 檔的工作樹內容(能反映未 commit 的改動 → 可 red/green)。
 *   - 排除 *.md(CLAUDE/ROADMAP/DECISIONS 保留 "formerly TOEIC Drill" 等歷史提及)。
 *   - 排除 package-lock.json(下次 npm install 重生,非手改)。
 *   - 排除本檔(內含 pattern 字面,否則自我命中)。
 *
 * 不會誤報
 *   裸 TOEIC/TOEFL/IELTS/GSAT(考試型別、分數帶、"TOEIC 商業詞彙")合法保留。pattern 一律
 *   要求 Drill/Tutor/App 尾綴,故考試型別永不命中。
 *
 * RED/GREEN
 *   改名前:package.json / electron.js / index.html / release.* / Review 命中 → FAIL。
 *   改名後:0 命中 → PASS。
 *
 * RUN:  node test-w8-rename-clean.mjs   (repo 根;exit 0 乾淨 / 1 有殘留)
 */
import { execFileSync } from 'node:child_process';

const SELF     = 'test-w8-rename-clean.mjs';
const EXCLUDES = [':!*.md', ':!package-lock.json', `:!${SELF}`];

// 大小寫不敏感的「產品名」形式;分隔符含 . 以涵蓋 appId 的 com.toeic.drill。
// 每個 pattern 都要求 drill/tutor/app 尾綴 → 裸 TOEIC 等考試型別不會命中。
const PATTERNS = [
  'toeic[ ._-]?drill',
  'test[ ._-]?drill',
  'english[ ._-]?tutor',
  'quizapp',
];

// git grep 無命中時 exit 1、stdout/stderr 皆空 → execFileSync 拋錯,視為「乾淨」。
// 其他錯誤(非 repo、pattern 壞)才向上拋。用 execFileSync(不走 shell)避免 Windows
// 下單引號 pathspec 與 * 被 shell 展開的跨平台問題。
function residue(pattern) {
  try {
    return execFileSync('git', ['grep', '-nIiE', pattern, '--', ...EXCLUDES],
      { encoding: 'utf8' }).trim();          // 非空 ⇒ 有殘留
  } catch (e) {
    if (e.status === 1 && !e.stderr) return ''; // 無命中 ⇒ 乾淨
    throw e;
  }
}

let ok = true;
console.log('W8 — rename residue guard (product-name forms → 0)');
for (const p of PATTERNS) {
  const found = residue(p);
  if (found) {
    ok = false;
    console.error(`  FAIL: /${p}/i 仍存在:`);
    found.split('\n').forEach(l => console.error('        ' + l));
  } else {
    console.log(`  ok  : /${p}/i — none`);
  }
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);