/**
 * Custom vocab import parser — pure logic, no platform APIs, no storage.
 *
 * Turns pasted text (one word per line) into word objects aligned with the
 * built-in vocab.json schema, so downstream sortVocab / selectDistractors can
 * read them directly. Kept framework-agnostic for the future mobile port.
 */

// Line separators between the English word and its Chinese meaning, checked by
// EARLIEST position in the line (not this list order): half-width comma, tab,
// full-width comma, half-width colon. All are a single code unit, so slicing at
// index+1 is uniform regardless of which one matched.
const SEPARATORS = [',', '\t', '，', ':'];

// Index of the first separator that appears in the line, or -1 if none.
function firstSeparatorIndex(line) {
  let best = -1;
  for (const sep of SEPARATORS) {
    const idx = line.indexOf(sep);
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best;
}

/**
 * Parse pasted vocab text into normalized word objects.
 *
 * Rules: one word per line; blank lines skipped; the first separator splits the
 * line into word + meaning_zh (both trimmed); no separator → whole line is the
 * word with an empty meaning; a line whose word part is empty is skipped.
 * De-duped by word.toLowerCase(), keeping the first occurrence (same style as
 * storage.js appendExtendedVocab).
 *
 * @param {string} raw
 * @returns {Array<object>} normalized words (may be empty)
 */
export function parseVocabText(raw) {
  const words = [];
  const seen  = new Set();

  for (const rawLine of String(raw ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const sepIdx = firstSeparatorIndex(line);
    const word       = (sepIdx === -1 ? line : line.slice(0, sepIdx)).trim();
    const meaning_zh = sepIdx === -1 ? '' : line.slice(sepIdx + 1).trim();

    if (!word) continue;                 // separator at line start → no word
    const key = word.toLowerCase();
    if (seen.has(key)) continue;         // keep first occurrence
    seen.add(key);

    words.push({
      word,
      meaning_zh,
      pos: '',
      phonetic: '',
      meaning_en: '',
      example: '',
      synonyms: [],
      exams: [],            // scope=custom bypasses exam filtering; kept for schema parity
      category: 'custom',
      difficulty: 2,
      frequency_tier: 2,    // must be <=2 so custom words pass selectDistractors' same-POS tier gate
      source: 'custom',
    });
  }

  return words;
}
