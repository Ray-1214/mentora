// test-b6-topic-removed.mjs
// B6 static guard: topic selector fully removed from Main; part6/7 use a real
// theme constant (no undefined leak); part5 passes empty themes; llm.js has the
// defensive fallback. Usage: node test-b6-topic-removed.mjs  (0=pass, 1=fail)
// Reasoned red/green: FAILS pre-B6 (TOPICS/topics/topics[0] present), PASSES after.
import { readFileSync } from 'node:fs';

const main = readFileSync('src/components/Main/index.js', 'utf8');
const llm  = readFileSync('src/services/llm.js', 'utf8');

const checks = [
  // --- Main: topic selector fingerprints must be ABSENT ---
  ['Main: no TOPICS constant',        () => !/\bconst\s+TOPICS\s*=/.test(main)],
  ['Main: no topics state',           () => !/\[\s*topics\s*,\s*setTopics\s*\]/.test(main)],
  ['Main: no toggleTopic',            () => !/toggleTopic/.test(main)],
  ['Main: no showTopics',             () => !/showTopics/.test(main)],
  ['Main: no topicsSummary',          () => !/topicsSummary/.test(main)],
  ['Main: no topics[0] to part6/7',   () => !/topics\[0\]/.test(main)],
  ['Main: no topics in config/calls', () => !/\btopics\b/.test(main)],  // any bare `topics` gone
  // --- Main: replacements must be PRESENT ---
  ['Main: DEFAULT_THEME const',       () => /const\s+DEFAULT_THEME\s*=\s*'academic'/.test(main)],
  ['Main: part6 uses DEFAULT_THEME',  () => /generatePart6\(\s*DEFAULT_THEME\s*,/.test(main)],
  ['Main: part7 uses DEFAULT_THEME',  () => /generatePart7\(\s*DEFAULT_THEME\s*,/.test(main)],
  ['Main: part5 themes = []',         () => /generatePart5\(\s*count\s*,\s*\[\s*\]\s*,/.test(main)],
  ['Main: selectPriorityWords no topics', () => /selectPriorityWords\([^)]*\)/.test(main) && !/selectPriorityWords\([^)]*topics/.test(main)],
  // --- llm.js: defensive fallback present at BOTH part6 and part7 ---
  ['llm.js: theme fallback x2',       () => (llm.match(/THEMES_LABEL\[theme\]\s*\|\|\s*theme\s*\|\|\s*'general English'/g) || []).length === 2],
];

let ok = true;
console.log('B6 guard — topic selector removed');
for (const [name, fn] of checks) {
  let pass = false;
  try { pass = fn(); } catch { pass = false; }
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}`);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);