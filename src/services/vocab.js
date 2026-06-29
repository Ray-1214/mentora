/**
 * Vocabulary selection logic:
 *  - selectAnswerWords()  – pick answer words by frequency_tier + mastery
 *  - selectDistractors()  – pick 3 distractors from the same bank
 *
 * Stats are keyed by word.toLowerCase() so cross-exam duplicates share progress.
 */

import { isDue } from './srs.js';

// ── Word selection ────────────────────────────────────────────────────────────

// Base sampling weight per frequency_tier (1 = most important). A higher weight
// means a word is more likely to be drawn. Tuned here so it is easy to adjust.
const TIER_WEIGHT = { 1: 3, 2: 2, 3: 1 };

/**
 * Sampling weight for a single word. Always > 0.
 * Favors important tiers, words seen less often as the answer, and words with a
 * shorter correct streak (more likely still being learned). Missing stats/tier
 * are treated as 0 / tier 3.
 */
function answerWeight(word, stats) {
  const s = stats[word.word.toLowerCase()] || {};
  const base = TIER_WEIGHT[word.frequency_tier] || 1;
  return base / (1 + (s.times_as_answer || 0)) / (1 + (s.consecutive_corrects || 0));
}

/**
 * Weighted random sampling without replacement using the numerically stable
 * A-Res (Efraimidis–Spirakis) log form: each candidate gets a key of
 * log(random) / weight, and we keep the `n` candidates with the largest keys.
 * The result is selection probability proportional to weight, without
 * replacement; the log form avoids the underflow of the u^(1/weight) form.
 */
function weightedSampleWithoutReplacement(candidates, stats, n) {
  if (n <= 0) return [];
  return candidates
    .map(w => ({ w, key: Math.log(Math.random()) / answerWeight(w, stats) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map(x => x.w);
}

/**
 * SRS-aware draw: words that are due for review come first. We split the pool
 * into due / not-due (a word with no srs_due is treated as due, so legacy stats
 * still get picked), sample from the due group with the 1a weighted sampler, and
 * only top up from the not-due group if there still aren't enough. `now` is
 * injectable so tests can advance the clock.
 */
function dueFirstSample(pool, stats, count, now) {
  const due = [];
  const notDue = [];
  for (const w of pool) {
    const s = stats[w.word.toLowerCase()] || {};
    (isDue(s.srs_due, now) ? due : notDue).push(w);
  }

  const picked = weightedSampleWithoutReplacement(due, stats, count);
  if (picked.length < count) {
    picked.push(...weightedSampleWithoutReplacement(notDue, stats, count - picked.length));
  }
  return picked;
}

/**
 * Select `count` answer words for a drill batch.
 *
 * Uses weighted random sampling without replacement instead of a fixed sort, so
 * words of equal priority no longer always emerge in database order (the old
 * "top-down / monotonous" behavior). Higher-priority words are still more likely
 * to be drawn — weight favors lower frequency_tier (3:2:1), less-seen words, and
 * shorter correct streaks — so teaching priority is preserved while same-priority
 * words get shuffled. For a brand-new user (empty stats) every weight collapses
 * to its tier weight, giving a random draw within each tier and a 3:2:1 tier
 * preference across tiers.
 *
 * On top of that (stage 1b) selection is SRS-aware: within the chosen group,
 * words that are due for review (Leitner) are drawn before words that aren't yet
 * due — see dueFirstSample.
 *
 * When includeMastered is false, mastered words are kept as a separate fallback
 * group: we sample from non-mastered words first and only top up from mastered
 * words if there aren't enough non-mastered ones. When true, everything is one
 * pool.
 */
export function selectAnswerWords(bank, stats, count, { exam = null, includeMastered = false, now = Date.now() } = {}) {
  const pool = exam ? bank.filter(w => w.exams && w.exams.includes(exam)) : [...bank];

  if (includeMastered) {
    return dueFirstSample(pool, stats, count, now);
  }

  // Split so mastered words can only ever serve as a "not enough" fallback,
  // never mixed into the same draw as non-mastered words.
  const notMastered = [];
  const mastered = [];
  for (const w of pool) {
    const s = stats[w.word.toLowerCase()] || {};
    (s.mastered ? mastered : notMastered).push(w);
  }

  const picked = dueFirstSample(notMastered, stats, count, now);
  if (picked.length < count) {
    picked.push(...weightedSampleWithoutReplacement(mastered, stats, count - picked.length));
  }
  return picked;
}

/**
 * Select `count` distractor words for a given answer word.
 * Prefers: same exam, same POS, tier 1-2 words (familiar but wrong)
 */
export function selectDistractors(answerWord, bank, exam, count = 3) {
  const answerKey = answerWord.word.toLowerCase();

  // Candidates: same exam (or any if not enough), exclude answer word
  const samePOS = bank.filter(w =>
    w.word.toLowerCase() !== answerKey &&
    (!exam || (w.exams && w.exams.includes(exam))) &&
    w.pos === answerWord.pos &&
    (w.frequency_tier || 3) <= 2
  );

  const anyPOS = bank.filter(w =>
    w.word.toLowerCase() !== answerKey &&
    (!exam || (w.exams && w.exams.includes(exam))) &&
    w.pos !== answerWord.pos &&
    (w.frequency_tier || 3) <= 2
  );

  // Shuffle each pool so we get variety
  const shuffled = [
    ...samePOS.sort(() => Math.random() - 0.5),
    ...anyPOS.sort(() => Math.random() - 0.5),
  ];

  // Deduplicate
  const seen = new Set([answerKey]);
  const result = [];
  for (const w of shuffled) {
    if (result.length >= count) break;
    const key = w.word.toLowerCase();
    if (!seen.has(key)) { seen.add(key); result.push(w); }
  }

  // Final fallback: any word from bank
  if (result.length < count) {
    for (const w of bank.sort(() => Math.random() - 0.5)) {
      if (result.length >= count) break;
      const key = w.word.toLowerCase();
      if (!seen.has(key)) { seen.add(key); result.push(w); }
    }
  }

  return result;
}

// ── Exam helpers ──────────────────────────────────────────────────────────────

export const EXAM_LABELS = {
  TOEIC:  'TOEIC',
  TOEFL:  'TOEFL',
  IELTS:  'IELTS',
  '學測': 'GSAT',   // General Scholastic Ability Test (Taiwan)
};

export const EXAM_CONTEXT = {
  TOEIC:  'business and office communication contexts (TOEIC format)',
  TOEFL:  'academic and university-level contexts (TOEFL iBT format)',
  IELTS:  'general and academic English contexts (IELTS format)',
  '學測': 'high school academic English contexts (Taiwan GSAT format)',
};

export const ALL_EXAMS = ['TOEIC', 'TOEFL', 'IELTS', '學測'];
