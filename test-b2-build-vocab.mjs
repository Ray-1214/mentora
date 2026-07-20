// test-b2-build-vocab.mjs
// Usage: node test-b2-build-vocab.mjs
// Verifies buildVocab satisfies the app's entry contract (exams/pos-string/tier/category)
// and preserves provenance. Runs against the real ceec-clean.json.
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { buildVocab } = await import('./scripts/build-vocab.mjs');

let pass = 0, fail = 0;
const ok = (c, m) => c ? (pass++, console.log('  OK ', m)) : (fail++, console.error('  XX ', m));

const clean = JSON.parse(readFileSync(join(__dirname, 'src/data/ceec-clean.json'), 'utf8'));
const v = buildVocab(clean);

// count
ok(v.length === 6169, `word count 6169 (got ${v.length})`);

// exams present on every entry -> pool filters won't empty
ok(v.every(w => Array.isArray(w.exams) && w.exams.includes('學測')), 'every entry has exams:["學測"]');

// pos is a STRING (app compares with ===), not array
ok(v.every(w => typeof w.pos === 'string'), 'pos is a string on every entry');
ok(v.some(w => w.pos.includes('/')), 'multi-POS words joined with "/" (e.g. v./n.)');
ok(v.every(w => Array.isArray(w.pos_array)), 'pos_array preserved as array');

// frequency_tier strictly in {1,2,3}; verify the level->tier mapping direction
const tiers = new Set(v.map(w => w.frequency_tier));
ok([...tiers].every(t => [1,2,3].includes(t)) && tiers.size === 3, `frequency_tier in {1,2,3} only (got ${[...tiers].sort()})`);
const byL = {}; v.forEach(w => { (byL[w.ceec_level] ??= new Set()).add(w.frequency_tier); });
ok([...byL[5]][0]===1 && byL[5].size===1, 'ceec_level 5 -> tier 1');
ok([...byL[6]][0]===1 && byL[6].size===1, 'ceec_level 6 -> tier 1');
ok([...byL[3]][0]===2 && byL[3].size===1, 'ceec_level 3 -> tier 2');
ok([...byL[4]][0]===2 && byL[4].size===1, 'ceec_level 4 -> tier 2');
ok([...byL[1]][0]===3 && byL[1].size===1, 'ceec_level 1 -> tier 3');
ok([...byL[2]][0]===3 && byL[2].size===1, 'ceec_level 2 -> tier 3');

// no tier-miss: every entry's tier is a TIER_WEIGHT key (1/2/3), so answerWeight never falls to ||1 by accident
ok(v.every(w => [1,2,3].includes(w.frequency_tier)), 'no entry would miss TIER_WEIGHT table');

// category present and non-empty (topic filter needs it)
ok(v.every(w => typeof w.category === 'string' && w.category.length > 0), 'every entry has a category');
ok(v.some(w => w.category !== 'academic'), 'guessCategory assigns some non-academic categories');

// meaning_zh / phonetic intentionally EMPTY (B3 fills) -> meaning modes disabled for now
ok(v.every(w => w.meaning_zh === ''), 'meaning_zh empty on every entry (B3 pending)');
ok(v.every(w => w.phonetic === ''), 'phonetic empty on every entry (enrichment pending)');

// provenance preserved
ok(v.every(w => w.source === 'ceec'), 'source=ceec on every entry');
ok(v.every(w => Number.isInteger(w.ceec_level) && w.ceec_level>=1 && w.ceec_level<=6), 'ceec_level preserved 1-6');
ok(v.every(w => typeof w.lemma_group === 'string'), 'lemma_group preserved');

// ids dense 1..N
ok(v[0].id === 1 && v[v.length-1].id === v.length, 'ids dense 1..N');

// spot-check a known compound-derived word survived
const byWord = Object.fromEntries(v.map(w => [w.word, w]));
ok(!!byWord['agreement'] && !!byWord['agree'], 'agree + agreement both present');
ok(!!byWord['calm'], 'calm present (was dropped in GPT .md)');

console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
