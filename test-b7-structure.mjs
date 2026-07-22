/**
 * B7 verification — structural guard (source-text checks; no imports/execution).
 * Run from repo root:  node test-b7-structure.mjs
 *
 * RED  (before): Main still holds the exam selector + old `length > 3` gates.
 * GREEN (after): selector gone, gate consolidated into hasUsableMeaning,
 *   CEEC-only data premise holds (so old default exam='TOEIC' was an empty bank).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let failed = 0;
const check = (name, cond, extra = '') => {
  const ok = !!cond;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) failed++;
};
const absent  = (src, re, label, file) => check(`${file}: no ${label}`, !re.test(src));
const present = (src, re, label, file) => check(`${file}: has ${label}`, re.test(src));

// ── A. Main/index.js fingerprint ──────────────────────────────────────────────
const main = read('src/components/Main/index.js');
absent (main, /setExam/,                         'setExam',               'Main');
absent (main, /useState\(\s*['"]TOEIC['"]\s*\)/, "useState('TOEIC')",     'Main');
absent (main, /\bALL_EXAMS\b/,                   'ALL_EXAMS',             'Main');
absent (main, /\bEXAM_LABELS\b/,                 'EXAM_LABELS',           'Main');
absent (main, /chip-exam/,                       'chip-exam class',       'Main');
absent (main, /examWordCount/,                   'examWordCount',         'Main');
absent (main, /\bactiveExam\b/,                  'activeExam',            'Main');
absent (main, /\.length\s*>\s*3/,                'length > 3 gate',       'Main');
present(main, /hasUsableMeaning/,                'hasUsableMeaning',      'Main');
present(main, /const\s+BANK_EXAM\s*=\s*['"]學測['"]/, "BANK_EXAM = '學測'", 'Main');

// ── A. CustomVocab/index.js ────────────────────────────────────────────────────
const cv = read('src/components/CustomVocab/index.js');
absent (cv, /\.length\s*>\s*3/, 'length > 3 gate',  'CustomVocab');
absent (cv, /\bhasZh\b/,        'local hasZh',      'CustomVocab');
present(cv, /hasUsableMeaning/, 'hasUsableMeaning', 'CustomVocab');

// ── A. vocab.js export ─────────────────────────────────────────────────────────
present(read('src/services/vocab.js'), /export\s+function\s+hasUsableMeaning/, 'hasUsableMeaning export', 'vocab.js');

// ── B. Data premise: single CEEC (學測) bank ──────────────────────────────────
const vocab = JSON.parse(read('src/data/vocab.json'));
const withExam = (ex) => vocab.filter(w => Array.isArray(w.exams) && w.exams.includes(ex)).length;
console.log(`\n  total: ${vocab.length} · 學測: ${withExam('學測')} · TOEIC: ${withExam('TOEIC')} · TOEFL: ${withExam('TOEFL')} · IELTS: ${withExam('IELTS')}\n`);
check('bank is non-empty', vocab.length > 0, `${vocab.length} words`);
check('every word is tagged 學測', withExam('學測') === vocab.length);
check("old default exam='TOEIC' resolves to an EMPTY bank (the demo break B7 removes)", withExam('TOEIC') === 0);
check('no TOEFL / IELTS words remain', withExam('TOEFL') === 0 && withExam('IELTS') === 0);

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' CHECK(S) FAILED'}`);
process.exit(failed === 0 ? 0 : 1);