// scripts/build-vocab.mjs
// Derive the app-facing vocab.json from the authoritative src/data/ceec-clean.json.
// Usage:  node scripts/build-vocab.mjs            (writes src/data/vocab.json)
//         node scripts/build-vocab.mjs --check    (dry-run: build in memory, print stats, write nothing)
// Exports pure fn buildVocab(cleanDoc) for tests. See DECISIONS #32.
//
// App contract (fields the app actually reads from one entry):
//   word, exams, pos(STRING, compared with ===), frequency_tier(1-3), category, meaning_zh, phonetic
// ceec-clean.json provides: word, pos(ARRAY), ceec_level(1-6), lemma_group, variant_relation, ...
// Translation:
//   exams          -> ['學測']            (single-exam bank; without it every pool filter empties)
//   pos            -> pos_array.join('/')  (app compares pos as a string; keep pos_array too)
//   frequency_tier -> ceec_level 5-6->1, 3-4->2, 1-2->3   (higher level = harder = higher priority)
//   category       -> guessCategory(word)  (topic filtering; else CEEC words get filtered out)
//   difficulty     -> LEVEL_TO_DIFF[ceec_level]  (app doesn't read it, but llm.js does for new words)
//   meaning_zh / meaning_en / phonetic / example -> kept EMPTY (filled by B3/enrichment)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLEAN = join(__dirname, '../src/data/ceec-clean.json');
const OUT   = join(__dirname, '../src/data/vocab.json');

const LEVEL_TO_DIFF = { 1:1, 2:1, 3:1, 4:2, 5:3, 6:3 };
function levelToTier(level) {
  if (level >= 5) return 1;   // ceec 5-6  -> tier 1 (most important / hardest)
  if (level >= 3) return 2;   // ceec 3-4  -> tier 2
  return 3;                    // ceec 1-2  -> tier 3
}

// Ported verbatim from the deprecated parse-ceec.js (keyword -> category heuristic).
function guessCategory(word) {
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

export function buildVocab(cleanDoc) {
  const words = cleanDoc.words || [];
  return words.map((w, i) => {
    const posArr = Array.isArray(w.pos) ? w.pos : (w.pos ? [w.pos] : []);
    return {
      id:             i + 1,
      word:           w.word,
      pos:            posArr.join('/'),      // STRING for app === comparison
      pos_array:      posArr,                // preserved for future use
      phonetic:       w.phonetic || '',      // empty; enrichment later
      meaning_zh:     w.meaning_zh || '',    // empty; B3 fills
      meaning_en:     w.meaning_en || '',
      example:        w.example || '',
      synonyms:       Array.isArray(w.synonyms) ? w.synonyms : [],
      exams:          ['學測'],              // single-exam bank
      category:       guessCategory(w.word), // topic filtering
      difficulty:     LEVEL_TO_DIFF[w.ceec_level] || 2,
      frequency_tier: levelToTier(w.ceec_level),
      ceec_level:     w.ceec_level,          // provenance; app doesn't read
      lemma_group:    w.lemma_group,         // provenance
      variant_relation: w.variant_relation,
      source:         'ceec',
      ...(w.inflections ? { inflections: w.inflections } : {}),
      enrichment:     w.enrichment || { meaning_zh:'pending', phonetic:'pending', example:'pending' },
    };
  });
}

function main() {
  const check = process.argv.includes('--check');
  const clean = JSON.parse(readFileSync(CLEAN, 'utf8'));
  const built = buildVocab(clean);

  // stats
  const byTier = {}, byCat = {}, byLevel = {};
  built.forEach(w => {
    byTier[w.frequency_tier] = (byTier[w.frequency_tier]||0)+1;
    byCat[w.category] = (byCat[w.category]||0)+1;
    byLevel[w.ceec_level] = (byLevel[w.ceec_level]||0)+1;
  });
  console.log('built words:', built.length);
  console.log('by frequency_tier:', byTier);
  console.log('by ceec_level    :', byLevel);
  console.log('by category      :', byCat);

  if (check) { console.log('\n--check: no file written.'); return; }
  writeFileSync(OUT, JSON.stringify(built, null, 2), 'utf8');
  console.log('\nwrote', OUT, '(' + built.length + ' words)');
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
