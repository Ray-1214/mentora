/**
 * test-stage3-part5-payload.mjs — Stage 3 Track B acceptance (payload inclusion).
 *
 * WHY THIS SHAPE
 *   Grammar-point weakness and Part 5 vocab hints are routed through the LLM
 *   PROMPT, not an algorithmic selector. LLM output compliance can't be unit
 *   tested, so the acceptance is redefined as: do the weak signals actually
 *   reach the prompt payload?  Target = 100% present when supplied, 0% when not.
 *
 * PRECONDITION (after Stage 3 implementation)
 *   The Part 5 prompt assembly is extracted from generatePart5 into a pure,
 *   side-effect-free function:
 *     buildPart5Prompt(count, themes, difficulty, priorityWords, grammarHints, exam)
 *   exported from ./src/services/part5Prompt.js — a module that does NOT import
 *   the OpenAI SDK and does NOT touch the network / env / filesystem, so it is
 *   importable under plain node. generatePart5 must call this same function so
 *   the tested payload is the real one.
 *
 * RUN
 *   node test-stage3-part5-payload.mjs
 *   Assumes repo-root placement and module path ./src/services/part5Prompt.js —
 *   adjust the import if you place the builder elsewhere.
 *   Exit 0 = pass, 1 = fail.
 */
import { buildPart5Prompt } from './src/services/part5Prompt.js';

// themes / difficulty / exam are placeholders: they don't affect these
// assertions, which only check that the supplied weak words + grammar points
// appear verbatim in the returned prompt string.
const THEMES     = ['business'];
const DIFFICULTY = 'medium';
const EXAM       = 'TOEIC';
const COUNT      = 6;

const WEAK_WORDS = ['aberration', 'ubiquitous', 'mitigate', 'nevertheless', 'procurement'];
const GRAMMAR    = ['subject-verb agreement', 'past perfect', 'relative clauses'];

const countIncluded = (haystack, needles) => {
  const hay = String(haystack).toLowerCase();
  return needles.filter(n => hay.includes(String(n).toLowerCase())).length;
};

let ok = true;
console.log('Stage 3 Track B — Part 5 payload inclusion');

// --- supplied case: every weak word + grammar point must be present ---
const promptWith = buildPart5Prompt(COUNT, THEMES, DIFFICULTY, WEAK_WORDS, GRAMMAR, EXAM);
const wHit = countIncluded(promptWith, WEAK_WORDS);
const gHit = countIncluded(promptWith, GRAMMAR);
console.log(`  supplied: weak words ${wHit}/${WEAK_WORDS.length} (${(100 * wHit / WEAK_WORDS.length).toFixed(0)}%)  grammar ${gHit}/${GRAMMAR.length} (${(100 * gHit / GRAMMAR.length).toFixed(0)}%)   (need 100% / 100%)`);
if (wHit !== WEAK_WORDS.length) { console.error(`  FAIL: only ${wHit}/${WEAK_WORDS.length} weak words reached the payload`); ok = false; }
if (gHit !== GRAMMAR.length)    { console.error(`  FAIL: only ${gHit}/${GRAMMAR.length} grammar points reached the payload`); ok = false; }

// --- empty case: nothing weakness-related should be present ---
const promptEmpty = buildPart5Prompt(COUNT, THEMES, DIFFICULTY, [], [], EXAM);
const wHit0 = countIncluded(promptEmpty, WEAK_WORDS);
const gHit0 = countIncluded(promptEmpty, GRAMMAR);
// the two hint scaffolds should collapse to empty strings -> their marker
// phrases must be absent too.
const markers = /user (?:struggles|has been getting)/i.test(promptEmpty);
console.log(`  empty   : weak words ${wHit0}/${WEAK_WORDS.length}  grammar ${gHit0}/${GRAMMAR.length}  hintMarkers=${markers}   (need 0 / 0 / false)`);
if (wHit0 !== 0 || gHit0 !== 0 || markers) { console.error('  FAIL: weakness content present in the empty-input payload'); ok = false; }

console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
