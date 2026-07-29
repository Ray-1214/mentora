// test-b11-de-toeic.mjs
// B11 guard: TOEIC brand strings removed from user-facing + latent spots; the
// only permitted residual is the EXAM_LABELS/EXAM_CONTEXT keys in vocab.js
// (kept intentionally for dynamic access). Usage: node test-b11-de-toeic.mjs
// Reasoned red/green: FAILS pre-B11, PASSES after.
import { readFileSync } from 'node:fs';

const settings = readFileSync('src/components/Settings/index.js', 'utf8');
const vocabMgr = readFileSync('src/components/VocabManager/index.js', 'utf8');
const llm      = readFileSync('src/services/llm.js', 'utf8');
const review   = readFileSync('src/components/Review/index.js', 'utf8');
const vocab    = readFileSync('src/services/vocab.js', 'utf8');

const checks = [
  // --- user-facing: must be gone / corrected ---
  ['Settings: no ~20,000 words',        () => !/~?20,?000 words/.test(settings)],
  ['Settings: no TOEIC · TOEFL line',   () => !/across TOEIC/.test(settings)],
  ['Settings: shows 6,169',             () => /6,?169 words/.test(settings)],
  ['VocabManager: no TOEIC score band', () => !/TOEIC \d{3}/.test(vocabMgr)],
  // --- llm.js: latent defaults + fallback corrected to 學測 ---
  ['llm: fallback → 學測',              () => /EXAM_CONTEXT\['學測'\]/.test(llm) && !/EXAM_CONTEXT\['TOEIC'\]/.test(llm)],
  ['llm: SYSTEM_PROMPT_BASE 學測',      () => /systemPrompt\('學測'\)/.test(llm) && !/systemPrompt\('TOEIC'\)/.test(llm)],
  ['llm: no exam = TOEIC default',      () => !/exam\s*=\s*'TOEIC'/.test(llm)],
  ['llm: VOCAB_LEVELS de-TOEIC',        () => !/TOEIC \d{3}-\d{3}/.test(llm)],
  ['llm: prompt no "TOEIC words"',      () => !/TOEIC (?:vocabulary )?words/.test(llm)],
  // --- Review: tag fallback de-TOEIC ---
  ['Review: no TOEIC fallback',         () => !/quizType\s*\|\|\s*'TOEIC'/.test(review)],
  // --- vocab.js: dict keys intentionally KEPT (guard the decision) ---
  ['vocab: EXAM_CONTEXT keys kept',     () => /TOEIC:/.test(vocab) && /TOEFL:/.test(vocab)],
];

let ok = true;
console.log('B11 guard — de-TOEIC cleanup');
for (const [name, fn] of checks) {
  let pass = false;
  try { pass = fn(); } catch { pass = false; }
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}`);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);