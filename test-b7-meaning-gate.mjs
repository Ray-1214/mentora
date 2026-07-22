/**
 * B7 verification — meaning_zh drill-eligibility gate.
 * Run from repo root:  node test-b7-meaning-gate.mjs
 *
 * RED  (before): vocab.js has no `hasUsableMeaning` export → clean fail below.
 * GREEN (after): helper exists; every non-empty meaning is drillable, rescuing
 *   the ~463 short (1–3 char) CEEC meanings the old `length > 3` gate excluded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const vocab = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'vocab.json'), 'utf8'));
const vocabMod = await import(pathToFileURL(path.join(root, 'src', 'services', 'vocab.js')).href);
const { hasUsableMeaning } = vocabMod;

let failed = 0;
const check = (name, cond, extra = '') => {
  const ok = !!cond;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) failed++;
};

// Clean red if the helper isn't there yet (avoids a raw TypeError crash).
if (typeof hasUsableMeaning !== 'function') {
  console.log('FAIL  hasUsableMeaning is not exported from vocab.js yet (expected before the fix).');
  process.exit(1);
}

const nonEmpty = (w) => typeof w.meaning_zh === 'string' && w.meaning_zh.trim().length > 0;
const oldGate  = (w) => !!(w.meaning_zh && w.meaning_zh.length > 3);   // the bug being removed

const nonEmptyWords = vocab.filter(nonEmpty);
const newEligible   = vocab.filter(hasUsableMeaning);
const oldEligible   = vocab.filter(oldGate);
const shortCorrect  = vocab.filter(w => nonEmpty(w) && w.meaning_zh.trim().length <= 3);
const rescued       = newEligible.length - oldEligible.length;

console.log(`\n  total words:             ${vocab.length}`);
console.log(`  non-empty meaning_zh:    ${nonEmptyWords.length}`);
console.log(`  drillable (new gate):    ${newEligible.length}`);
console.log(`  drillable (old >3 gate): ${oldEligible.length}`);
console.log(`  short 1–3 char correct:  ${shortCorrect.length}   (B4 audit expected ≈463)`);
console.log(`  rescued by the fix:      ${rescued}\n`);

check('hasUsableMeaning is a function', typeof hasUsableMeaning === 'function');
check('new gate == non-empty predicate over the whole bank',
  newEligible.length === nonEmptyWords.length, `${newEligible.length} vs ${nonEmptyWords.length}`);
check('short (1–3 char) meanings exist and are ALL drillable now',
  shortCorrect.length > 0 && shortCorrect.every(hasUsableMeaning), `${shortCorrect.length} checked`);
check('old >3 gate excluded every one of those short meanings',
  shortCorrect.every(w => !oldGate(w)));
check('rescued population is large (> 300) — the fix has real effect', rescued > 300, `rescued=${rescued}`);
check('new gate is a strict superset of the old gate', oldEligible.every(hasUsableMeaning));

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' CHECK(S) FAILED'}`);
process.exit(failed === 0 ? 0 : 1);