/**
 * test-stage3-weakness-routing.mjs — Stage 3 Track A acceptance (deterministic).
 *
 * WHAT IT PROVES
 *   A word flagged as a weak vocab word is selected by selectAnswerWords at a
 *   materially higher rate than an IDENTICAL non-weak word — the measurable
 *   "weakness uplift" the Stage 3 acceptance asks for (with a number).
 *
 * METHOD (matched pairs, so the ratio isolates the weakness bonus)
 *   - Fixture has 5 "weak" and 5 "twin" words: same frequency_tier AND the same
 *     wordStats profile (times_as_answer / streak / SRS). The ONLY difference is
 *     membership in the weakWords list handed to selectAnswerWords.
 *   - 20 filler words (mixed tiers) make each draw competitive.
 *   - Math.random is seeded (mulberry32) and `now` is injected, so the run is
 *     fully reproducible.  We draw COUNT words for N rounds and tally.
 *   - Treatment (weakWords supplied): weakRate / twinRate must be >= 2.0x.
 *   - Control   (weakWords = []):     weakRate / twinRate must be ~1x (the
 *     fixture is symmetric, so any deviation would be a fixture artifact, not
 *     routing). Calibrated observation: treatment ~3.5x, control ~1.0x.
 *
 * PRECONDITION (after Stage 3 implementation)
 *   selectAnswerWords accepts an options key `weakWords` (array of word strings)
 *   and boosts those words' sampling weight inside answerWeight. If that key is
 *   missing / ignored, the treatment ratio collapses to ~1x and this test FAILS
 *   — which is exactly the signal that routing isn't wired.
 *
 * RUN
 *   node test-stage3-weakness-routing.mjs
 *   Assumes this file sits at repo root beside the existing test-stage*.mjs and
 *   that vocab.js is at ./src/services/vocab.js — adjust the import path if not.
 *   Exit 0 = pass, 1 = fail.
 */
import { selectAnswerWords } from './src/services/vocab.js';

// ---- seeded RNG so the printed numbers are reproducible ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOW  = 1_700_000_000_000;
const DAY  = 86_400_000;
const PAST = NOW - DAY;            // an SRS due date in the past -> the word is due

// ---- fixture ----
const bank = [];
const stats = {};
const weakWords = [];

// 5 weak + 5 twin: same tier(2) and the same "answered wrong" stat profile.
for (let i = 1; i <= 5; i++) {
  const wk = `weak${i}`, tw = `twin${i}`;
  bank.push({ word: wk, frequency_tier: 2, exams: ['TOEIC'] });
  bank.push({ word: tw, frequency_tier: 2, exams: ['TOEIC'] });
  const profile = { times_as_answer: 3, consecutive_corrects: 0, srs_box: 0, srs_due: PAST, mastered: false };
  stats[wk] = { ...profile };
  stats[tw] = { ...profile };
  weakWords.push(wk);             // only the weak ones are flagged
}
// 20 fillers, mixed tiers, all due -> a competitive pool.
for (let i = 1; i <= 20; i++) {
  const f = `fill${i}`;
  const tier = (i % 3 === 0) ? 1 : (i % 3 === 1) ? 3 : 2;
  bank.push({ word: f, frequency_tier: tier, exams: ['TOEIC'] });
  if (i % 2 === 0) stats[f] = { times_as_answer: 1, consecutive_corrects: 0, srs_box: 0, srs_due: PAST, mastered: false };
}

const COUNT = 8;
const N     = 5000;
const SEED  = 0xC0FFEE;

const WEAK = [1, 2, 3, 4, 5].map(i => `weak${i}`);
const TWIN = [1, 2, 3, 4, 5].map(i => `twin${i}`);
const meanRate = (appear, names) => names.reduce((s, n) => s + appear[n] / N, 0) / names.length;

function trial(weak) {
  Math.random = mulberry32(SEED);            // reseed so both trials share the same stream
  const appear = {};
  bank.forEach(w => (appear[w.word] = 0));
  for (let r = 0; r < N; r++) {
    selectAnswerWords(bank, stats, COUNT, { includeMastered: false, now: NOW, weakWords: weak })
      .forEach(w => appear[w.word]++);
  }
  return { weakRate: meanRate(appear, WEAK), twinRate: meanRate(appear, TWIN) };
}

const t = trial(weakWords);
const c = trial([]);
const tRatio = t.weakRate / t.twinRate;
const cRatio = c.weakRate / c.twinRate;

const UPLIFT_MIN = 2.0;
const CTRL_LO = 0.8, CTRL_HI = 1.25;

console.log(`Stage 3 Track A — weakness routing uplift  (N=${N}, count=${COUNT}, pool=${bank.length}, seed=0x${SEED.toString(16)})`);
console.log(`  treatment: weakRate=${t.weakRate.toFixed(4)}  twinRate=${t.twinRate.toFixed(4)}  uplift=${tRatio.toFixed(3)}x   (need >= ${UPLIFT_MIN}x)`);
console.log(`  control  : weakRate=${c.weakRate.toFixed(4)}  twinRate=${c.twinRate.toFixed(4)}  ratio =${cRatio.toFixed(3)}x   (need in [${CTRL_LO}, ${CTRL_HI}])`);

let ok = true;
if (!(tRatio >= UPLIFT_MIN)) {
  console.error(`  FAIL: uplift ${tRatio.toFixed(3)}x < ${UPLIFT_MIN}x — weak words not boosted (is the weakWords option wired into answerWeight?)`);
  ok = false;
}
if (!(cRatio >= CTRL_LO && cRatio <= CTRL_HI)) {
  console.error(`  FAIL: control ratio ${cRatio.toFixed(3)}x outside [${CTRL_LO}, ${CTRL_HI}] — fixture/weight asymmetry`);
  ok = false;
}

console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
