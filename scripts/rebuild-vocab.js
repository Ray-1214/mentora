/**
 * Merge TOEIC + 學測 + TOEFL + IELTS into a single vocab.json.
 * Prerequisite: run scripts/fetch-vocab.js first.
 * Usage: node scripts/rebuild-vocab.js
 */

const fs   = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../src/data');

// ── Source priority (higher = keep this entry's metadata if word appears in multiple sources)
const SOURCE_PRIORITY = { hand_curated: 4, toefl: 3, ielts: 2, ceec: 1 };

// ── Load existing base vocab (TOEIC hand-curated + 學測/CEEC) ─────────────────
function loadBase() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'vocab.json'), 'utf8'));

  return raw.map(w => {
    // Determine which exams this word belongs to based on existing metadata
    let exams;
    if (w.toeic_priority === 1 && !w.ceec_level) {
      exams = ['TOEIC'];
    } else if (w.ceec_level) {
      exams = ['學測'];
    } else {
      exams = ['TOEIC'];
    }

    // Map old toeic_priority / ceec_level to frequency_tier
    let frequency_tier = w.frequency_tier;
    if (!frequency_tier) {
      if (w.toeic_priority === 1) frequency_tier = 1;
      else if (w.ceec_level >= 5) frequency_tier = 1;
      else if (w.ceec_level >= 3) frequency_tier = 2;
      else frequency_tier = 3;
    }

    return {
      id:             w.id,
      word:           w.word.toLowerCase(),
      pos:            w.pos || '',
      phonetic:       w.phonetic || '',
      meaning_zh:     w.meaning_zh || '',
      meaning_en:     w.meaning_en || '',
      example:        w.example  || '',
      synonyms:       w.synonyms || [],
      exams,
      category:       w.category || 'academic',
      difficulty:     w.difficulty || 2,
      frequency_tier,
      source:         w.toeic_priority === 1 && !w.ceec_level ? 'hand_curated' : 'ceec',
      ceec_level:     w.ceec_level || null,
    };
  });
}

// ── Load fetched raw data ─────────────────────────────────────────────────────
function loadRaw(name, examLabel) {
  const file = path.join(DATA, `${name}-raw.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  Warning: ${file} not found — run fetch-vocab.js first`);
    return [];
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
    .map(e => ({
      word:           e.word.toLowerCase(),
      pos:            e.pos || '',
      phonetic:       e.phonetic || '',
      meaning_zh:     e.meaning_zh || '',
      meaning_en:     '',
      example:        '',
      synonyms:       [],
      exams:          [examLabel],
      category:       'academic',
      difficulty:     e.frequency_tier === 1 ? 1 : e.frequency_tier === 2 ? 2 : 3,
      frequency_tier: e.frequency_tier || 2,
      source:         name,
      ceec_level:     null,
    }));
}

// ── Merge ─────────────────────────────────────────────────────────────────────
function merge(base, ...sources) {
  // Map: word → entry
  const map = new Map();

  for (const entry of base) {
    map.set(entry.word, { ...entry });
  }

  for (const entries of sources) {
    for (const e of entries) {
      if (map.has(e.word)) {
        const existing = map.get(e.word);
        // Add exam to existing entry if not already present
        for (const exam of e.exams) {
          if (!existing.exams.includes(exam)) existing.exams.push(exam);
        }
        // Improve frequency_tier if new source says it's more important
        if (e.frequency_tier < existing.frequency_tier) {
          existing.frequency_tier = e.frequency_tier;
        }
        // Fill in phonetic if missing
        if (!existing.phonetic && e.phonetic) existing.phonetic = e.phonetic;
        // Prefer richer meaning_zh
        if (e.meaning_zh.length > existing.meaning_zh.length) {
          existing.meaning_zh = e.meaning_zh;
        }
      } else {
        map.set(e.word, { ...e });
      }
    }
  }

  // Assign stable numeric IDs and sort
  const sorted = [...map.values()].sort((a, b) => {
    // Sort by: frequency_tier, then alphabetically
    if (a.frequency_tier !== b.frequency_tier) return a.frequency_tier - b.frequency_tier;
    return a.word.localeCompare(b.word);
  });

  return sorted.map((w, i) => ({ ...w, id: i + 1 }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('Loading base vocab (TOEIC + 學測)…');
  const base = loadBase();
  console.log(`  ${base.length} base entries`);

  console.log('Loading TOEFL raw…');
  const toefl = loadRaw('toefl', 'TOEFL');
  console.log(`  ${toefl.length} TOEFL entries`);

  console.log('Loading IELTS raw (Oxford)…');
  const ielts = loadRaw('ielts', 'IELTS');
  console.log(`  ${ielts.length} IELTS entries`);

  console.log('Merging…');
  const merged = merge(base, toefl, ielts);

  // Stats
  const examCounts = {};
  for (const w of merged) {
    for (const e of w.exams) examCounts[e] = (examCounts[e] || 0) + 1;
  }
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  for (const w of merged) tierCounts[w.frequency_tier]++;

  const out = path.join(DATA, 'vocab.json');
  fs.writeFileSync(out, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`\n✓ Written ${merged.length} words to vocab.json`);
  console.log('\nBy exam:');
  Object.entries(examCounts).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nBy frequency tier:');
  Object.entries(tierCounts).forEach(([k, v]) => console.log(`  Tier ${k}: ${v}`));
}

main();
