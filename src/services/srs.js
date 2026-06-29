/**
 * Spaced-repetition scheduling (Leitner box system) — pure logic, no platform APIs.
 *
 * Each word has an `srs_box` (0..N) and an `srs_due` timestamp. A correct answer
 * promotes the word one box (longer interval); a wrong answer drops it back to
 * box 0 (review again today). `srs_due` is recomputed from the new box.
 *
 * Keep this module platform-independent: it must survive the future mobile port
 * untouched, so it may not import any Electron/Node/browser API.
 */

// Review interval per Leitner box, in days. index = box number.
// Box 0 = due immediately (same day); higher boxes wait progressively longer.
export const SRS_INTERVALS_DAYS = [0, 1, 2, 4, 7, 14, 30];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Next Leitner box after an answer.
 *  - wrong  → back to box 0 (review again today)
 *  - correct → promote one box, capped at the last box
 */
export function nextBox(currentBox, correct) {
  if (!correct) return 0;
  return Math.min((currentBox || 0) + 1, SRS_INTERVALS_DAYS.length - 1);
}

/**
 * Due timestamp for a word in the given box, measured from `now`.
 * Box is clamped into range so out-of-range values can't index past the table.
 */
export function dueFromBox(box, now) {
  const b = Math.max(0, Math.min(box, SRS_INTERVALS_DAYS.length - 1));
  return now + SRS_INTERVALS_DAYS[b] * DAY_MS;
}

/**
 * Is a word due for review at `now`?
 * A missing `srs_due` (legacy stats without SRS fields) counts as due, so old
 * data is picked normally without any migration.
 */
export function isDue(srsDue, now) {
  return srsDue == null || srsDue <= now;
}
