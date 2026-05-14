// Parse CEEC 高中英文參考詞彙表 and merge into src/data/vocab.json
// Usage: node scripts/parse-ceec.js
// Output: updates src/data/vocab.json in-place

const fs   = require('fs');
const path = require('path');

const CEEC_FILE  = path.join(__dirname, '../高中英文參考詞彙表_111學年度起適用.md');
const VOCAB_FILE = path.join(__dirname, '../src/data/vocab.json');

// CEEC level → app difficulty (1=easy,2=medium,3=hard) — all 6 levels included
const LEVEL_TO_DIFF = { '1': 1, '2': 1, '3': 1, '4': 2, '5': 3, '6': 3 };

// Simple keyword → TOEIC category heuristic
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
  return 'academic';  // default for CEEC-sourced words
}

// Parse a word from a CEEC line (handle "achieve(ment)", "actor/actress", etc.)
function parseWord(raw) {
  // Take first slash-separated variant
  let w = raw.split('/')[0].trim();
  // Remove parenthetical suffixes like (ment), (tion)
  w = w.replace(/\(.*?\)/, '').trim();
  // Remove trailing dots or dashes
  w = w.replace(/[.\-]+$/, '').trim();
  return w.toLowerCase();
}

// Parse POS: "v./(n.)" → "v.", "adj./n." → "adj."
function parsePOS(raw) {
  return raw.split('/')[0].trim();
}

function main() {
  const lines  = fs.readFileSync(CEEC_FILE, 'utf8').split('\n');
  const base   = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));

  const existing = new Set(base.map(w => w.word.toLowerCase()));
  let nextId = Math.max(...base.map(w => typeof w.id === 'number' ? w.id : 0)) + 1;

  // Line pattern: word pos level (may have extra spaces)
  const pat = /^(.+?)\s+((?:[a-z]+\.?\/)*[a-z]+\.?)\s+(\d)\s*$/;
  const added = [];
  const skipped = { tooBasic: 0, duplicate: 0, unparseable: 0 };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const m = pat.exec(line);
    if (!m) { skipped.unparseable++; continue; }

    const level = m[3];
    // Include all levels 1-6

    const word = parseWord(m[1]);
    const pos  = parsePOS(m[2]);

    // Skip very short or non-alphabetic words
    if (word.length < 3 || !/^[a-z]/.test(word)) { skipped.unparseable++; continue; }

    // Skip duplicates
    if (existing.has(word)) { skipped.duplicate++; continue; }

    // TOEIC priority by CEEC level:
    // Level 5-6 → priority 2 (advanced, often tested in TOEIC)
    // Level 3-4 → priority 3 (intermediate)
    // Level 1-2 → priority 4 (basic, less likely as test focus)
    const toeicPriority = (level >= '5') ? 2 : (level >= '3') ? 3 : 4;

    existing.add(word);
    added.push({
      id:             nextId++,
      word,
      pos,
      meaning_zh:     '',
      meaning_en:     '',
      example:        '',
      synonyms:       [],
      category:       guessCategory(word, pos),
      difficulty:     LEVEL_TO_DIFF[level] || 2,
      ceec_level:     parseInt(level),
      toeic_priority: toeicPriority,
      times_tested:   0,
      times_correct:  0,
    });
  }

  const merged = [...base, ...added];
  fs.writeFileSync(VOCAB_FILE, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`Done!`);
  console.log(`  Base words:      ${base.length}`);
  console.log(`  CEEC added:      ${added.length}`);
  console.log(`  Total:           ${merged.length}`);
  console.log(`  Skipped (basic): ${skipped.tooBasic}`);
  console.log(`  Skipped (dup):   ${skipped.duplicate}`);
  console.log(`  Skipped (parse): ${skipped.unparseable}`);

  // Category breakdown
  const cats = {};
  added.forEach(w => { cats[w.category] = (cats[w.category] || 0) + 1; });
  console.log('\nCategory distribution of new words:');
  Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
}

main();
