// test-a1-ceec-parse.mjs
// Usage: node test-a1-ceec-parse.mjs
// Verifies parseCeecEntries: compound expansion, wrap heal, glue quarantine,
// no polluted words, POS-homograph survival, and real-.md invariants.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { parseCeecEntries } = require('./scripts/parse-ceec.js');

let pass = 0, fail = 0;
const ok = (c, m) => c ? (pass++, console.log('  OK ', m)) : (fail++, console.error('  XX ', m));

const SAMPLE = [
  '# A',
  'ability n. 1',
  'art n. 1',                                 // word colliding with POS "art."
  'agree(ment) v./(n.) 1',                    // paren-suffix, positional POS
  'actor/actress n. 1',                       // slash variant, shared POS
  'bicycle/bike n. 1',                        // slash abbrev
  'advertise(ment)/ad v./(n.) 3',             // mixed
  'congressman/ congresswoman n. 6',          // line-wrap heal
  'accomplish(ment) v./(n.) accord n./v. 5',  // GLUED -> quarantine
].join('\n');

const r = parseCeecEntries(SAMPLE);
const byWord = Object.fromEntries(r.entries.map(e => [e.word, e]));
const has = w => Object.prototype.hasOwnProperty.call(byWord, w);

ok(has('ability') && byWord.ability.pos === 'n.' && byWord.ability.ceec_level === 1, 'simple line parsed');
ok(has('art') && byWord.art.ceec_level === 1, 'word "art" not swallowed as POS');
ok(has('agree') && has('agreement'), 'agree(ment) -> agree + agreement');
ok(byWord.agree?.pos === 'v.' && byWord.agreement?.pos === 'n.', 'positional POS (2 variants / 2 POS)');
ok(has('actor') && has('actress') && byWord.actor.pos === 'n.' && byWord.actress.pos === 'n.', 'actor/actress -> both, shared n.');
ok(has('bicycle') && has('bike'), 'bicycle/bike -> both');
ok(has('advertise') && has('advertisement'), 'advertise(ment)/ad -> advertise + advertisement');
ok(has('congressman') && has('congresswoman'), 'line-wrap healed -> congressman + congresswoman');
ok(!has('accomplish') && !has('accord'), 'glued line quarantined (accomplish/accord not emitted)');
ok(r.quarantined.some(q => /accomplish/.test(q.line)), 'glued line appears in quarantined report');

const badSyn = r.entries.filter(e => /\s/.test(e.word) || /[()]/.test(e.word) || /^[a-z]{1,6}\.$/.test(e.word));
ok(badSyn.length === 0, 'synthetic: no polluted words (space/parens/POS-token)');

const CEEC = path.join(__dirname, '高中英文參考詞彙表_111學年度起適用.md');
if (fs.existsSync(CEEC)) {
  const real = parseCeecEntries(fs.readFileSync(CEEC, 'utf8'));
  const rbad = real.entries.filter(e => /\s/.test(e.word) || /[()]/.test(e.word) || /^[a-z]{1,6}\.$/.test(e.word));
  ok(rbad.length === 0, 'real .md: 0 polluted words' + (rbad.length ? ' -> ' + JSON.stringify(rbad.slice(0,5).map(e=>e.word)) : ''));
  const lvbad = real.entries.filter(e => !Number.isInteger(e.ceec_level) || e.ceec_level < 1 || e.ceec_level > 6);
  ok(lvbad.length === 0, 'real .md: all ceec_level in 1..6');
  console.log(`  .. real .md -> entries: ${real.entries.length} | quarantined: ${real.quarantined.length} | dups: ${real.dups.length} | unparseable: ${real.unparseable.length}`);
} else {
  console.log('  .. real .md not found; regression guard skipped');
}

console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
