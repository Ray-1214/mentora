// Parse CEEC 高中英文參考詞彙表 into the canonical CEEC word set.
// Usage (report only, does NOT write any file):  node scripts/parse-ceec.js
// Exports pure fn parseCeecEntries(mdText) for the vocab rebuild (A2) and tests.
//
// Line grammar (one logical entry): <word-spec> <pos-spec> <level 1-6>
//   word-spec  e.g. "ability", "agree(ment)", "actor/actress", "advertise(ment)/ad"
//   pos-spec   e.g. "n.", "v./(n.)", "adj./n."   (each slash-group = <=6 letters + a dot)
//   level      single digit 1-6
// Compound handling:
//   - slash variants -> separate words          (actor/actress -> actor, actress)
//   - paren suffix    -> base + base+suffix       (agree(ment)   -> agree, agreement)
//   - line-wrapped slash chains are healed        (congressman/ congresswoman -> both)
//   - lines gluing TWO entries (only the last carries a level) are QUARANTINED, not parsed,
//     because the first entry's level is unrecoverable from the line — fix it in the .md.

const fs   = require('fs');
const path = require('path');

const CEEC_FILE = path.join(__dirname, '../高中英文參考詞彙表_111學年度起適用.md');

// CEEC level → app difficulty (1=easy,2=medium,3=hard) — all 6 levels included
const LEVEL_TO_DIFF = { '1': 1, '2': 1, '3': 1, '4': 2, '5': 3, '6': 3 };

// Simple keyword → category heuristic (unchanged; consumed by the A2 rebuild)
function guessCategory(word, pos) {
  const w = word.toLowerCase();
  const businessVerbs = ['manage','organize','arrange','schedule','approve','submit','confirm','notify','assess','assign','authorize','coordinate','facilitate','implement','negotiate','review','revise','allocate','evaluate','maintain','monitor','obtain','process','propose','report','request','verify','clarify','compile','conduct','consult','delegate','determine','document','establish','finalize','generate','identify','initiate','justify','maximize','minimize','outsource','perform','provide','respond','specify','summarize','transfer'];
  const financeWords = ['account','asset','audit','balance','budget','capital','cost','credit','debit','deposit','dividend','expense','finance','fund','gross','income','interest','invest','invoice','loan','profit','quarter','revenue','salary','surplus','tax','transaction','turnover'];
  const hrWords = ['applicant','candidate','career','certificate','colleague','competent','contract','eligible','employee','evaluate','hire','interview','performance','position','promote','qualify','recruit','reference','resign','retire','skills','staff','supervise','terminate','training','vacancy','workforce'];
  const travelWords = ['accommodation','arrival','baggage','board','cancel','customs','delay','depart','destination','fare','flight','hotel','itinerary','luggage','passport','reservation','route','terminal','transit','travel','trip','visa','voucher'];
  const techWords = ['component','compatible','database','develop','digital','equipment','install','integrate','interface','maintain','manufacture','network','operate','output','prototype','software','specification','system','technology','upgrade','version'];
  const marketingWords = ['advertise','brand','campaign','client','compete','consumer','demand','discount','distribute','exclusive','launch','market','merchandise','negotiate','niche','offer','promote','purchase','quota','retail','sales','strategy','target','wholesale'];
  const facilityWords = ['accessible','adjacent','amenity','capacity','commercial','facility','inspect','lease','maintenance','occupancy','premises','property','renovation','residential','tenant','utility','vacancy','warehouse'];
  const diningWords = ['appetizer','banquet','beverage','catering','cuisine','dine','gratuity','menu','portion','recipe','refreshment','reservation','venue'];
  if (businessVerbs.includes(w)) return 'business';
  if (financeWords.includes(w)) return 'finance';
  if (hrWords.includes(w)) return 'hr';
  if (travelWords.includes(w)) return 'travel';
  if (techWords.includes(w)) return 'technology';
  if (marketingWords.includes(w)) return 'marketing';
  if (facilityWords.includes(w)) return 'facilities';
  if (diningWords.includes(w)) return 'dining';
  return 'academic';
}

// POS-token: every slash-group is (optional paren) 1-6 letters + a REQUIRED dot (optional paren).
// The required trailing dot separates a POS tag ("art.") from a homographic word ("art").
function isPosToken(tok) {
  const groups = tok.split('/');
  return groups.length > 0 && groups.every(g => /^\(?[a-z]{1,6}\.\)?$/.test(g));
}

// Expand a healed word-spec into standard single words.
//  "agree(ment)"        -> ["agree","agreement"]
//  "actor/actress"      -> ["actor","actress"]
//  "advertise(ment)/ad" -> ["advertise","advertisement","ad"]
// Paren content is treated as a SUFFIX appended to the base; a paren holding a full
// replacement word (e.g. "argue(argument)") yields a junk join surfaced in the manifest.
function expandWordSpec(spec) {
  const out = [];
  for (const variant of spec.split('/').map(s => s.trim()).filter(Boolean)) {
    const m = variant.match(/^([a-z.''\-]+)\(([a-z.''\-]+)\)$/i);
    if (m) { out.push(m[1]); out.push(m[1] + m[2]); }
    else   { out.push(variant.replace(/[()]/g, '')); }
  }
  return out;
}

// Map pos-spec parts to expanded words: positional when counts match, else all share full spec.
function mapPos(words, posSpec) {
  const parts = posSpec.split('/').map(p => p.replace(/[()]/g, '').trim()).filter(Boolean);
  if (parts.length === words.length) return words.map((w, i) => ({ word: w, pos: parts[i] }));
  const full = parts.join('/');
  return words.map(w => ({ word: w, pos: full }));
}

function normalizeWord(w) { return w.toLowerCase().replace(/[.\-]+$/, '').trim(); }

function parseLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) return { type: 'skip' };

  const toks = line.split(/\s+/);
  const levelTok = toks[toks.length - 1];
  if (!/^[1-6]$/.test(levelTok)) return { type: 'unparseable', line };
  const level = parseInt(levelTok, 10);

  const body = toks.slice(0, -1);
  if (body.length === 0) return { type: 'unparseable', line };

  const entries = [];
  let cur = [];
  for (const t of body) {
    if (isPosToken(t)) {
      if (cur.length === 0) return { type: 'unparseable', line };
      entries.push({ wordToks: cur, posSpec: t });
      cur = [];
    } else {
      cur.push(t);
    }
  }
  if (cur.length > 0) return { type: 'unparseable', line };
  if (entries.length !== 1) return { type: 'glued', line, entryCount: entries.length };

  const healed = entries[0].wordToks.join('').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  const mapped = mapPos(expandWordSpec(healed), entries[0].posSpec);
  return { type: 'ok', level, healed, mapped };
}

// Pure: parse full .md text into canonical CEEC entries + diagnostics.
function parseCeecEntries(mdText) {
  const entries = [];
  const seen = new Map();
  const quarantined = [];
  const unparseable = [];
  const dups = [];
  const compoundManifest = [];

  for (const raw of mdText.split(/\r?\n/)) {
    const r = parseLine(raw);
    if (r.type === 'skip') continue;
    if (r.type === 'unparseable') { unparseable.push(r.line); continue; }
    if (r.type === 'glued') { quarantined.push({ line: r.line, entryCount: r.entryCount }); continue; }

    const produced = [];
    for (const { word, pos } of r.mapped) {
      const w = normalizeWord(word);
      if (w.length < 3 || !/^[a-z]/.test(w)) continue;
      produced.push(w);
      if (seen.has(w)) { dups.push(w); continue; }
      const entry = { word: w, pos, ceec_level: r.level };
      seen.set(w, entry);
      entries.push(entry);
    }
    if (/[()\/]/.test(r.healed)) compoundManifest.push({ src: r.healed, words: produced });
  }

  return { entries, quarantined, unparseable, dups, compoundManifest };
}

function main() {
  const md = fs.readFileSync(CEEC_FILE, 'utf8');
  const { entries, quarantined, unparseable, dups, compoundManifest } = parseCeecEntries(md);

  const byLevel = {};
  entries.forEach(e => { byLevel[e.ceec_level] = (byLevel[e.ceec_level] || 0) + 1; });

  console.log('=== CEEC parse (report only — no file written) ===');
  console.log('Total CEEC words:', entries.length);
  console.log('By ceec_level  :', byLevel);
  console.log('Dups (within .md, first kept):', dups.length, dups.length ? dups.slice(0, 20) : '');
  console.log('Unparseable lines:', unparseable.length);
  unparseable.slice(0, 20).forEach(l => console.log('   ?', JSON.stringify(l)));

  console.log('\n--- QUARANTINED glued lines (fix in .md: split entries + restore missing level) ---');
  console.log('count:', quarantined.length);
  quarantined.forEach(q => console.log('   !', JSON.stringify(q.line)));

  console.log('\n--- Compound expansions (eyeball for junk joins e.g. argue(argument)) ---');
  console.log('count:', compoundManifest.length);
  compoundManifest.slice(0, 80).forEach(c => console.log('   .', c.src, '->', c.words.join(', ')));
  if (compoundManifest.length > 80) console.log('   ... (', compoundManifest.length - 80, 'more)');
}

module.exports = { parseCeecEntries, guessCategory, LEVEL_TO_DIFF, isPosToken, expandWordSpec };

if (require.main === module) main();
