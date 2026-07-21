// 用法: node scripts/check-gsat-bank.mjs   (放在 repo 根目錄執行)
// 唯讀,不寫任何檔案。單一 CEEC 學測字庫健檢。
// (B4 改寫:原多考試/OALD8 溯源段落已隨 B1-B3 作廢;vocab.json 現為 6169 字單一 CEEC 來源。)
import fs from 'fs';
const v = JSON.parse(fs.readFileSync('./src/data/vocab.json', 'utf8'));
const has = (w) => w.meaning_zh && w.meaning_zh.length > 3;   // Main/index.js 的實際門檻

console.log('=== 1. 字庫概況 ===');
const bySource = {}; v.forEach(w => bySource[w.source] = (bySource[w.source]||0)+1);
const byExam = {}; v.forEach(w => (w.exams||[]).forEach(x => byExam[x] = (byExam[x]||0)+1));
console.log('  總字數:', v.length);
console.log('  by source:', JSON.stringify(bySource));
console.log('  by exam  :', JSON.stringify(byExam));

console.log('\n=== 2. 中文釋義覆蓋率(決定 defmatch / reversedrill 可不可用)===');
const ok = v.filter(has).length;
console.log(`  有中文釋義 ${ok} / ${v.length}  (${(100*ok/v.length).toFixed(1)}%)`);
const noZh = v.filter(w => !has(w));
if (noZh.length) { console.log(`  缺中文 ${noZh.length} 筆,前 10:`); noZh.slice(0,10).forEach(w => console.log('   ', w.word)); }

console.log('\n=== 3. ceec_level × frequency_tier 交叉表(檢驗 tier 派生自官方級別)===');
const x = {};
for (const w of v) { const k = `level=${w.ceec_level} tier=${w.frequency_tier}`; x[k] = (x[k]||0)+1; }
Object.entries(x).sort().forEach(([k, n]) => console.log('   ', k, '→', n));
console.log('  ↑ 對角線分布 → tier 由 ceec_level 決定(5-6→1 / 3-4→2 / 1-2→3),非字母序。');

console.log('\n=== 4. 其他欄位填充狀態 ===');
console.log('  有音標', v.filter(w => w.phonetic).length, '| 有例句', v.filter(w => w.example).length, '/', v.length, '(音標/例句為 enrichment pending,尚未填)');
console.log('  by ceec_level:', JSON.stringify(v.reduce((m,w)=>{m[w.ceec_level]=(m[w.ceec_level]||0)+1;return m;},{})));
