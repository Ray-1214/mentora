// test-b9-review-recent.mjs
// B9 static guard for src/components/Review/index.js.
// Usage: node test-b9-review-recent.mjs   (exit 0 = pass, 1 = fail)
// Reasoned red/green: FAILS on pre-B9 file (no showAll / no reverse / still
// `filtered.map(`), PASSES on the intended B9 edit.
import { readFileSync } from 'node:fs';
const path = 'src/components/Review/index.js';
const src = readFileSync(path, 'utf8');

const checks = [
  ['showAll state',                  /const\s*\[\s*showAll\s*,\s*setShowAll\s*\]\s*=\s*useState/, true],
  ['RECENT_LIMIT = 10',              /RECENT_LIMIT\s*=\s*10\b/,                                    true],
  ['reverse a COPY of filtered',     /\[\s*\.\.\.\s*filtered\s*\]\s*\.reverse\(\)/,                true],
  ['slice(0, RECENT_LIMIT)',         /slice\(\s*0\s*,\s*RECENT_LIMIT\s*\)/,                        true],
  ['renders visibleItems',           /visibleItems\.map\(/,                                        true],
  ['delete-index invariant kept',    /items\.indexOf\(\s*item\s*\)/,                               true],  // must NOT be display index
  ['Show all (N) label',             /Show all \(/,                                                true],
  ['Show less label',                /Show less/,                                                  true],
  ['old renderer removed',           /filtered\.map\(/,                                            false], // must be ABSENT
];

let ok = true;
console.log(`B9 guard — ${path}`);
for (const [name, re, shouldMatch] of checks) {
  const pass = re.test(src) === shouldMatch;
  if (!pass) ok = false;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${shouldMatch ? '' : '  (must be ABSENT)'}`);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);