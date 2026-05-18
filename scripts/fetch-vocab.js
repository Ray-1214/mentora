/**
 * Fetch TOEFL + IELTS vocabulary from GitHub and save as JSON.
 * Run: node scripts/fetch-vocab.js
 * Output: src/data/toefl-raw.json, src/data/ielts-raw.json
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const AGENT = new https.Agent({ rejectUnauthorized: false }); // university SSL workaround

const SOURCES = {
  toefl: 'https://raw.githubusercontent.com/mahavivo/english-wordlists/master/TOEFL.txt',
  ielts: 'https://raw.githubusercontent.com/mahavivo/english-wordlists/master/OALD8_abridged_edited.txt',
};

// ── HTTP fetch ────────────────────────────────────────────────────────────────
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: AGENT }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end',  () => resolve(data));
    }).on('error', reject);
  });
}

// ── POS normalisation ─────────────────────────────────────────────────────────
const OALD_POS = {
  'noun': 'n.', 'verb': 'v.', 'adjective': 'adj.', 'adverb': 'adv.',
  'preposition': 'prep.', 'conjunction': 'conj.', 'exclamation': 'excl.',
  'number': 'num.', 'pronoun': 'pron.', 'determiner': 'det.',
  'abbreviation': 'abbr.', 'article': 'art.', 'symbol': 'sym.',
};

function normPOS(raw) {
  const lower = (raw || '').toLowerCase().trim();
  return OALD_POS[lower] || lower || '';
}

// ── TOEFL.txt parser ─────────────────────────────────────────────────────────
// Format: abandon [ə'bændən] vt. 放弃,沉溺 n. 放任
function parseTOEFL(text) {
  const entries = [];
  const lines = text.split('\n');
  let rank = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const bStart = line.indexOf('[');
    const bEnd   = line.indexOf(']', bStart);
    if (bStart === -1 || bEnd === -1) continue;

    const word     = line.slice(0, bStart).trim().toLowerCase();
    if (!word || word.length < 2 || !/^[a-z]/.test(word)) continue;

    const phonetic = line.slice(bStart + 1, bEnd).trim();
    const rest     = line.slice(bEnd + 1).trim();

    // Extract first POS abbreviation (e.g., "vt.", "n.", "adj.", "vt./vi.")
    const posMatch = rest.match(/^([a-z]+\.(?:\/[a-z]+\.)*)\s*/);
    const pos      = posMatch ? posMatch[1] : '';
    const defRaw   = posMatch ? rest.slice(posMatch[0].length) : rest;

    // First Chinese definition chunk (before numbered sub-def or secondary POS)
    let meaning_zh = defRaw
      .split(/\s+\d+\s+/)[0]           // stop at "1 xxx"
      .split(/\s+[a-z]+\.\s+/)[0]      // stop at secondary POS
      .replace(/^\s*\d+\s+/, '')        // strip leading number
      .trim()
      .slice(0, 80);

    rank++;
    entries.push({ word, phonetic, pos, meaning_zh, rank });
  }

  return entries;
}

// ── OALD8 parser ──────────────────────────────────────────────────────────────
// Format: aardvark [ˈɑːrdvɑːrk] noun 土豚（非洲食蟻獸）
function parseOALD8(text) {
  const entries = [];
  const lines   = text.split('\n');
  let rank = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const bStart = line.indexOf('[');
    const bEnd   = line.indexOf(']', bStart);
    if (bStart === -1 || bEnd === -1) continue;

    const word     = line.slice(0, bStart).trim().toLowerCase().replace(/[^a-z\-']/g, '');
    if (!word || word.length < 2 || !/^[a-z]/.test(word)) continue;

    const phonetic = line.slice(bStart + 1, bEnd).trim();
    const rest     = line.slice(bEnd + 1).trim();

    // Match POS keyword (noun/verb/adjective/…)
    let pos = '', defRaw = rest;
    for (const [full] of Object.entries(OALD_POS)) {
      if (rest.toLowerCase().startsWith(full)) {
        pos    = normPOS(full);
        defRaw = rest.slice(full.length).trim();
        break;
      }
    }

    const meaning_zh = defRaw
      .split(/[;；]/)[0]
      .replace(/\(.*?\)/g, '')
      .trim()
      .slice(0, 80);

    if (!meaning_zh) continue;

    rank++;
    entries.push({ word, phonetic, pos, meaning_zh, rank });
  }

  return entries;
}

// ── frequency tier ───────────────────────────────────────────────────────────
function assignTier(rank, total) {
  const pct = rank / total;
  if (pct <= 0.20) return 1;   // top 20% = core
  if (pct <= 0.55) return 2;   // 20-55% = important
  return 3;                     // rest = supplementary
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const OUT = path.join(__dirname, '../src/data');
  fs.mkdirSync(OUT, { recursive: true });

  for (const [exam, url] of Object.entries(SOURCES)) {
    console.log(`\nFetching ${exam.toUpperCase()} from ${url}…`);
    let text;
    try {
      text = await fetchText(url);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
      continue;
    }

    const raw     = exam === 'toefl' ? parseTOEFL(text) : parseOALD8(text);
    const total   = raw.length;
    const entries = raw.map((e, i) => ({
      ...e,
      frequency_tier: assignTier(e.rank, total),
      exam: exam === 'toefl' ? 'TOEFL' : 'IELTS',
    }));

    const out = path.join(OUT, `${exam}-raw.json`);
    fs.writeFileSync(out, JSON.stringify(entries, null, 2), 'utf8');
    console.log(`  Parsed ${entries.length} entries → ${out}`);
  }

  console.log('\nDone. Now run: node scripts/rebuild-vocab.js');
}

main().catch(console.error);
