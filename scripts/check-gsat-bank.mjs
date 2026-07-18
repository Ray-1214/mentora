// 用法: node check-gsat-bank.mjs   (放在 repo 根目錄執行)
// 唯讀,不寫任何檔案。
// 目的:①決定「首頁預設考試改成學測」是否安全(學測範圍有沒有中文釋義)
//      ②釐清學測的中文是不是從 OALD8 重疊帶進來的(授權是否跟著搬)
//      ③檢驗 frequency_tier 是不是字母序(決定 MTR-F-005 能不能寫「分層」)
import fs from 'fs';
const v = JSON.parse(fs.readFileSync('./src/data/vocab.json', 'utf8'));
const has = (w) => w.meaning_zh && w.meaning_zh.length > 3;   // Main/index.js 的實際門檻
const by = (e) => v.filter(w => (w.exams || []).includes(e));
const [gsat, toeic, ielts, toefl] = ['學測', 'TOEIC', 'IELTS', 'TOEFL'].map(by);
const SETS = [['學測', gsat], ['TOEIC', toeic], ['IELTS', ielts], ['TOEFL', toefl]];

console.log('=== 1. 中文釋義覆蓋率(決定 defmatch / reversedrill 可不可用)===');
for (const [n, a] of SETS) {
  const ok = a.filter(has).length;
  console.log(`  ${n.padEnd(6)} 總 ${String(a.length).padStart(6)}  有中文 ${String(ok).padStart(6)}  ${(100 * ok / a.length).toFixed(1)}%`);
}

console.log('\n=== 2. 學測的中文是自己的,還是 OALD8 重疊帶進來的?===');
const pure = gsat.filter(w => !(w.exams || []).includes('IELTS') && !(w.exams || []).includes('TOEFL'));
const ovl  = gsat.filter(w => (w.exams || []).includes('IELTS') || (w.exams || []).includes('TOEFL'));
console.log(`  純學測(不重疊) ${pure.length} 筆 → 有中文 ${pure.filter(has).length} (${(100*pure.filter(has).length/(pure.length||1)).toFixed(1)}%)`);
console.log(`  與 OALD8/TOEFL 重疊 ${ovl.length} 筆 → 有中文 ${ovl.filter(has).length} (${(100*ovl.filter(has).length/(ovl.length||1)).toFixed(1)}%)`);
console.log('  ↑ 若「純學測」中文覆蓋率遠低於「重疊」→ 學測的中文是牛津的。');
console.log('  純學測前 5 筆:');
pure.slice(0, 5).forEach(w => console.log('   ', JSON.stringify({ word: w.word, meaning_zh: w.meaning_zh, pos: w.pos, tier: w.frequency_tier, ceec_level: w.ceec_level, source: w.source })));

console.log('\n=== 3. frequency_tier 是不是字母序?(檢驗 MTR-F-005)===');
for (const t of [1, 2, 3]) {
  const a = ielts.filter(w => w.frequency_tier === t).map(w => w.word[0].toLowerCase()).sort();
  const u = [...new Set(a)];
  console.log(`  IELTS tier ${t}: ${a.length} 字,首字母 ${u[0]}–${u[u.length - 1]} (${u.length} 種)`);
}
console.log('  ↑ 若三層的首字母範圍不重疊(如 a–f / f–p / p–z)→ tier = 字母序,不是詞頻。');

console.log('\n=== 4. 學測: ceec_level × frequency_tier 交叉表 ===');
const x = {};
for (const w of gsat) { const k = `level=${w.ceec_level} tier=${w.frequency_tier}`; x[k] = (x[k] || 0) + 1; }
Object.entries(x).sort().forEach(([k, n]) => console.log('   ', k, '→', n));
console.log('  ↑ 若對角線分布 → tier 承載了大考中心官方分級,F-005 可寫「依官方難度分級」。');

console.log('\n=== 5. TOEIC 331 完整度 ===');
console.log('  有中文', toeic.filter(has).length, '| 有音標', toeic.filter(w => w.phonetic).length, '| 有例句', toeic.filter(w => w.example).length, '/ 331');