/**
 * test-w8-deadcode-clean.mjs — W8 死碼叢集清除 guard。
 *
 * 背景:一叢 QuizApp 範本殘骸(7 源檔 + 6 story)import 未安裝的 semantic-ui-react
 * (+ 死的 Countdown 另 import 未安裝的 sweetalert2),全在 CRA build graph 之外。
 * 刪除後應:(1) 這 13 檔不再被 git 追蹤;(2) src 內不再有 semantic-ui / sweetalert2 import。
 *
 * 為何不能只靠 npm run build:Layout 等死檔不在 build graph,留一支帶 dangling import
 * 的死檔,build 照過、驗不出來。故本 guard 直接斷言檔案已移除,不倚賴 build。
 *
 * RED/GREEN:刪除前 13 檔在 + 6 處 semantic-ui import → FAIL;刪除後 → PASS。
 *
 * RUN:  node test-w8-deadcode-clean.mjs   (repo 根;exit 0 乾淨 / 1 有殘留)
 */
import { execFileSync } from 'node:child_process';

const DELETED = [
  'src/components/Header/index.js',
  'src/components/Header/index.stories.js',
  'src/components/Layout/index.js',
  'src/components/Countdown/index.js',
  'src/components/Countdown/index.stories.js',
  'src/components/Offline/index.js',
  'src/components/Offline/index.stories.js',
  'src/components/ShareButton/index.js',
  'src/components/ShareButton/index.stories.js',
  'src/components/Result/QNA.js',
  'src/components/Result/QNA.stories.js',
  'src/components/Result/Stats.js',
  'src/components/Result/Stats.stories.js',
  'src/serviceWorkerRegistration.js',
  'src/service-worker.js',
];

let ok = true;
const fail = (m) => { console.error('  FAIL: ' + m); ok = false; };

console.log('W8 — dead-code cluster removal guard');

// 1) 13 檔皆不應再被 git 追蹤(catch 掉「Layout 留下 → dangling import Header」這種 build 驗不到的殘留)
const tracked = new Set(
  execFileSync('git', ['ls-files', '--', 'src'], { encoding: 'utf8' }).split('\n').filter(Boolean)
);
let still = 0;
for (const f of DELETED) if (tracked.has(f)) { fail(`仍被追蹤:${f}`); still++; }
if (still === 0) console.log(`  ok  : 全部 ${DELETED.length} 個死檔已從 git 移除`);

// 2) src 內不應再有 semantic-ui / sweetalert2 import(幽靈依賴消滅)
function residue(pattern) {
  try {
    return execFileSync('git', ['grep', '-nIiE', pattern, '--', 'src'], { encoding: 'utf8' }).trim();
  } catch (e) {
    if (e.status === 1 && !e.stderr) return '';   // 無命中 = 乾淨
    throw e;
  }
}
for (const p of ['semantic-ui', 'sweetalert2']) {
  const hit = residue(p);
  if (hit) { fail(`/${p}/ 仍存在於 src:`); hit.split('\n').forEach(l => console.error('        ' + l)); }
  else console.log(`  ok  : src 內無 ${p} import`);
}

console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);