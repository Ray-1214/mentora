/**
 * Vocabulary selection logic:
 *  - selectAnswerWords()  – pick answer words by frequency_tier + mastery
 *  - selectDistractors()  – pick 3 distractors from the same bank
 *
 * Stats are keyed by word.toLowerCase() so cross-exam duplicates share progress.
 */

// ── Word selection ────────────────────────────────────────────────────────────

/**
 * Select `count` answer words for a drill batch.
 * Priority: non-mastered → lower frequency_tier → least seen → worst accuracy
 */
export function selectAnswerWords(bank, stats, count, { exam = null, includeMastered = false } = {}) {
  let pool = exam ? bank.filter(w => w.exams && w.exams.includes(exam)) : [...bank];

  pool.sort((a, b) => {
    const sa = stats[a.word.toLowerCase()] || {};
    const sb = stats[b.word.toLowerCase()] || {};

    // Mastered words go to the very end
    const mA = !includeMastered && sa.mastered;
    const mB = !includeMastered && sb.mastered;
    if (mA !== mB) return mA ? 1 : -1;

    // Frequency tier (1=most important first)
    const tA = a.frequency_tier || 3, tB = b.frequency_tier || 3;
    if (tA !== tB) return tA - tB;

    // Least appeared as answer first
    const ansA = sa.times_as_answer || 0, ansB = sb.times_as_answer || 0;
    if (ansA !== ansB) return ansA - ansB;

    // Worst consecutive_corrects first (more likely to still be struggling)
    const ccA = sa.consecutive_corrects || 0, ccB = sb.consecutive_corrects || 0;
    return ccA - ccB;
  });

  return pool.slice(0, count);
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
