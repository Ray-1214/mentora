// test-b3-meaning-format.mjs
// Usage: node test-b3-meaning-format.mjs
// Read-only audit of meaning_zh quality in ceec-clean.json. Flags susp: entries; does NOT fix.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const doc = JSON.parse(readFileSync(join(__dirname, 'src/data/ceec-clean.json'), 'utf8'));
const W = doc.words || [];
const filled = W.filter(w => (w.enrichment?.meaning_zh) === 'llm');

// Common simplified-only chars to catch simplified leakage (subset; extend as needed)
const SIMPLIFIED = /[个们这里发国过时间对说来学会讲话务实动员东车马鸟点热爱观语题应识别质荣]/;
const ENGLISH_RUN = /[A-Za-z]{3,}(\s+[A-Za-z]{3,}){2,}/;   // 3+ consecutive English words = leaked sentence
// Kept in lockstep with looksBad() in scripts/enrich-meanings.mjs.
const REFUSAL = /(as an ai|i cannot|i'm unable|i am unable|language model|我無法回答|我不能提供|無法協助)/i;

const flags = { empty:[], tooShort:[], tooLong:[], noCjk:[], hasNewline:[], simplified:[], englishRun:[], refusal:[] };
for (const w of filled) {
  const s = (w.meaning_zh || '').trim();
  if (!s) { flags.empty.push(w.word); continue; }
  if (s.length < 1) flags.tooShort.push(w.word);
  if (s.length > 120) flags.tooLong.push(`${w.word}(${s.length})`);
  if (!/[一-鿿]/.test(s)) flags.noCjk.push(w.word);
  if (/[\r\n]/.test(s)) flags.hasNewline.push(w.word);
  if (SIMPLIFIED.test(s)) flags.simplified.push(`${w.word}:${s.slice(0,20)}`);
  if (ENGLISH_RUN.test(s)) flags.englishRun.push(`${w.word}:${s.slice(0,30)}`);
  if (REFUSAL.test(s)) flags.refusal.push(w.word);
}

console.log(`meaning_zh filled (enrichment=llm): ${filled.length}/${W.length}`);
console.log(`still pending: ${W.length - filled.length}`);
let total = 0;
for (const [k, arr] of Object.entries(flags)) {
  console.log(`\n[${k}] ${arr.length}`);
  arr.slice(0, 25).forEach(x => console.log('   ', x));
  if (arr.length > 25) console.log(`    …(+${arr.length - 25} more)`);
  total += arr.length;
}
console.log(`\nTOTAL flagged: ${total}  (these keep enrichment='pending' effectively — review & rerun, or fix manually)`);
console.log(total === 0 ? 'CLEAN ✅ (of filled entries)' : 'REVIEW NEEDED — spot-check flagged entries against the word');
