// test-b5-misselect-signal.mjs
// B5 test for getWeakVocabWords' two-signal logic in src/services/storage.js.
// storage.js imports electron-store transitively, so we DON'T import it under
// node; instead we (A) static-assert the new logic is present, and (B) re-run an
// inlined copy of the exact algorithm against synthetic wrongAnswers to prove the
// threshold / dedupe / ordering behavior. Keep the inlined copy in sync with
// storage.js if that function changes.
// Usage: node test-b5-misselect-signal.mjs   (0=pass, 1=fail)
// Reasoned red/green: the STATIC half FAILS pre-B5 (no userAnswer miss logic).
import { readFileSync } from 'node:fs';

let ok = true;

// ── (A) static: the new secondary-signal logic must be present ──
const src = readFileSync('src/services/storage.js', 'utf8');
const staticChecks = [
  ['reads userAnswer for miss signal', /quizType === 'Reverse Drill' && w\.userAnswer/],
  ['stricter threshold n >= 3',        /filter\(\(\[, n\]\) => n >= 3\)/],
  ['dedupes against primary',          /primarySet\.has\(word\)/],
  ['appends secondary after primary',  /\[\s*\.\.\.primary\s*,\s*\.\.\.secondary\s*\]/],
];
console.log('B5 (A) static — getWeakVocabWords two-signal logic');
for (const [name, re] of staticChecks) {
  const pass = re.test(src);
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}`);
}

// ── (B) behavioral: inlined algorithm copy vs synthetic data ──
// MUST mirror storage.js getWeakVocabWords exactly.
function weakWordsFrom(wrong) {
  const answerCounts = {};
  wrong
    .filter(w => ['Vocabulary', 'Definition Match', 'Reverse Drill'].includes(w.quizType) && w.word)
    .slice(-120)
    .forEach(w => { answerCounts[w.word] = (answerCounts[w.word] || 0) + 1; });
  const primary = Object.entries(answerCounts)
    .filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([w]) => w);

  const missCounts = {};
  wrong
    .filter(w => w.quizType === 'Reverse Drill' && w.userAnswer)
    .slice(-120)
    .forEach(w => { const k = String(w.userAnswer).toLowerCase(); missCounts[k] = (missCounts[k] || 0) + 1; });
  const primarySet = new Set(primary.map(x => String(x).toLowerCase()));
  const secondary = Object.entries(missCounts)
    .filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([w]) => w)
    .filter(w => !primarySet.has(w));

  return [...primary, ...secondary];
}

const R = (userAnswer, word) => ({ quizType: 'Reverse Drill', word, userAnswer });
const wrong = [
  // "banana" as ANSWER missed 2x → primary
  { quizType: 'Reverse Drill', word: 'banana', userAnswer: 'apple' },
  { quizType: 'Reverse Drill', word: 'banana', userAnswer: 'cherry' },
  // "grape" mis-selected as DISTRACTOR 3x → secondary (meets >=3)
  R('grape', 'melon'), R('grape', 'lemon'), R('grape', 'peach'),
  // "olive" mis-selected only 2x → below threshold, must NOT appear
  R('olive', 'onion'), R('olive', 'garlic'),
  // "apple" mis-selected 3x BUT also a primary answer-miss below → dedupe test
  R('apple', 'pear'), R('apple', 'plum'), R('apple', 'kiwi'),
  { quizType: 'Reverse Drill', word: 'apple', userAnswer: 'fig' },
  { quizType: 'Reverse Drill', word: 'apple', userAnswer: 'date' },
];

const out = weakWordsFrom(wrong);
console.log('\nB5 (B) behavioral — output:', JSON.stringify(out));
const behavioral = [
  ['banana present (primary answer-miss)', out.includes('banana')],
  ['grape present (secondary >=3)',        out.includes('grape')],
  ['olive ABSENT (miss only 2x)',          !out.includes('olive')],
  ['apple present once (deduped)',         out.filter(w => w === 'apple').length === 1],
  ['primary ranks before secondary',       out.indexOf('banana') < out.indexOf('grape')],
];
for (const [name, pass] of behavioral) {
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}`);
}

console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);