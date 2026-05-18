// Unified storage service — uses electron-store via IPC in Electron, localStorage in browser.

const isElectron = Boolean(window.electronAPI);

async function get(key) {
  if (isElectron) return window.electronAPI.storeGet(key);
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function set(key, value) {
  if (isElectron) return window.electronAPI.storeSet(key, value);
  localStorage.setItem(key, JSON.stringify(value));
}

async function del(key) {
  if (isElectron) return window.electronAPI.storeDelete(key);
  localStorage.removeItem(key);
}

// ── Mastery config ────────────────────────────────────────────────────────────
export const DEFAULT_MASTERY_THRESHOLD = 7;

export async function getMasteryThreshold() {
  const s = await getSettings();
  return s.masteryThreshold ?? DEFAULT_MASTERY_THRESHOLD;
}

// ── Word Stats ────────────────────────────────────────────────────────────────
// Key: word.toLowerCase()  (stable across vocab rebuilds; cross-exam words share stats)
//
// Shape per word:
// {
//   option_appearance_count: number,  — times shown as ANY option (answer or distractor)
//   consecutive_corrects:    number,  — current streak as correct answer (resets on wrong)
//   times_as_answer:         number,  — times shown as the correct answer
//   mastered:                boolean, — true when consecutive_corrects >= threshold
//   last_seen:               number,  — timestamp
// }

export async function getWordStats() {
  return (await get('wordStats')) || {};
}

/**
 * Update stats for words shown in a single question.
 *
 * @param {string}   answerWord     – the correct answer word (lowercase)
 * @param {string[]} distractorWords – other words shown as options
 * @param {boolean}  userCorrect    – did the user select the correct answer?
 */
export async function updateWordStats(answerWord, distractorWords, userCorrect) {
  const threshold = await getMasteryThreshold();
  const stats     = await getWordStats();
  const now       = Date.now();

  const allShown = [answerWord, ...distractorWords];

  // 1. Increment option_appearance_count for ALL shown words
  for (const word of allShown) {
    const key = word.toLowerCase();
    if (!stats[key]) stats[key] = { option_appearance_count: 0, consecutive_corrects: 0, times_as_answer: 0, mastered: false, last_seen: now };
    stats[key].option_appearance_count += 1;
    stats[key].last_seen = now;
  }

  // 2. Update answer word stats
  const aKey = answerWord.toLowerCase();
  stats[aKey].times_as_answer += 1;
  if (userCorrect) {
    stats[aKey].consecutive_corrects += 1;
    if (stats[aKey].consecutive_corrects >= threshold) stats[aKey].mastered = true;
  } else {
    stats[aKey].consecutive_corrects = 0;  // RESET on wrong answer
  }

  await set('wordStats', stats);
  return stats[aKey];
}

export async function getMasteredCount() {
  const stats = await getWordStats();
  return Object.values(stats).filter(s => s.mastered).length;
}

export async function resetWordStats() {
  await del('wordStats');
}

// ── Legacy adapter (old per-id vocab stats used by Vocab Bank Manager) ────────
export async function getVocabStats() {
  // Proxy: read from wordStats but return in old format for components still using it
  return (await get('wordStats')) || {};
}

// ── Wrong answers (review notebook) ──────────────────────────────────────────
export async function getWrongAnswers() {
  return (await get('wrongAnswers')) || [];
}

export async function addWrongAnswer(entry) {
  const list = await getWrongAnswers();
  const exists = list.some(w => w.question === entry.question && w.quizType === entry.quizType);
  if (!exists) list.push({ ...entry, addedAt: Date.now() });
  await set('wrongAnswers', list.slice(-200));
}

export async function removeWrongAnswer(index) {
  const list = await getWrongAnswers();
  list.splice(index, 1);
  await set('wrongAnswers', list);
}

export async function clearWrongAnswers() {
  await del('wrongAnswers');
}

// Analyse recent Part 5 wrong answers → top weak grammar points
export async function getWeakGrammarPoints() {
  const wrong  = await getWrongAnswers();
  const counts = {};
  wrong
    .filter(w => w.quizType === 'Part 5' && w.grammarPoint)
    .slice(-40)
    .forEach(w => { counts[w.grammarPoint] = (counts[w.grammarPoint] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
}

// Return words the user has answered incorrectly 2+ times recently
export async function getWeakVocabWords() {
  const wrong  = await getWrongAnswers();
  const counts = {};
  wrong
    .filter(w => w.quizType === 'Vocabulary' && w.word)
    .slice(-60)
    .forEach(w => { counts[w.word] = (counts[w.word] || 0) + 1; });
  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

// ── Quiz history ──────────────────────────────────────────────────────────────
export async function getQuizHistory() {
  return (await get('quizHistory')) || [];
}

export async function addQuizSession(session) {
  const history = await getQuizHistory();
  history.push({ ...session, completedAt: Date.now() });
  await set('quizHistory', history.slice(-50));
}

// ── Extended vocab bank ───────────────────────────────────────────────────────
export async function getExtendedVocab() {
  return (await get('extendedVocab')) || [];
}

export async function appendExtendedVocab(newWords) {
  const existing    = await getExtendedVocab();
  const existingSet = new Set(existing.map(w => w.word.toLowerCase()));
  const base        = existing.length;
  const fresh = newWords
    .filter(w => w.word && !existingSet.has(w.word.toLowerCase()))
    .map((w, i) => ({ ...w, id: `gen_${base + i + 1}` }));
  const merged = [...existing, ...fresh];
  await set('extendedVocab', merged);
  return merged;
}

export async function clearExtendedVocab() {
  await del('extendedVocab');
}

// ── API Settings ──────────────────────────────────────────────────────────────
export async function getSettings() {
  return (await get('apiSettings')) || {};
}

export async function saveSettings(settings) {
  await set('apiSettings', settings);
}

export async function hasApiKey() {
  const s = await getSettings();
  return Boolean(s.apiKey && s.apiKey.trim().length > 0);
}
