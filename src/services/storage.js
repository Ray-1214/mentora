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
export const DEFAULT_MASTERY_THRESHOLD = 7; // correct answers to graduate a word

export async function getMasteryThreshold() {
  const s = await getSettings();
  return s.masteryThreshold ?? DEFAULT_MASTERY_THRESHOLD;
}

// ── Vocab stats ───────────────────────────────────────────────────────────────
export async function getVocabStats() {
  return (await get('vocabStats')) || {};
}

export async function updateVocabStats(wordId, correct) {
  const stats    = await getVocabStats();
  const threshold = await getMasteryThreshold();
  if (!stats[wordId]) stats[wordId] = { times_tested: 0, times_correct: 0, mastered: false };
  stats[wordId].times_tested += 1;
  if (correct) {
    stats[wordId].times_correct += 1;
    if (stats[wordId].times_correct >= threshold) {
      stats[wordId].mastered = true;
    }
  }
  await set('vocabStats', stats);
  return stats[wordId];
}

// Returns Set of mastered word IDs
export async function getMasteredIds() {
  const stats = await getVocabStats();
  return new Set(
    Object.entries(stats)
      .filter(([, s]) => s.mastered)
      .map(([id]) => id)
  );
}

export async function getMasteredCount() {
  const ids = await getMasteredIds();
  return ids.size;
}

export async function resetVocabStats() {
  await del('vocabStats');
}

// ── Wrong answers (review notebook) ──────────────────────────────────────────
export async function getWrongAnswers() {
  return (await get('wrongAnswers')) || [];
}

export async function addWrongAnswer(entry) {
  const list = await getWrongAnswers();
  const exists = list.some(
    w => w.question === entry.question && w.quizType === entry.quizType
  );
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

// Analyse recent Part 5 wrong answers and return top weak grammar points
export async function getWeakGrammarPoints() {
  const wrong = await getWrongAnswers();
  const counts = {};
  wrong
    .filter(w => w.quizType === 'Part 5' && w.grammarPoint)
    .slice(-40)
    .forEach(w => { counts[w.grammarPoint] = (counts[w.grammarPoint] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
}

// Return recently-wrong vocab words (answered incorrectly 2+ times)
export async function getWeakVocabWords() {
  const wrong = await getWrongAnswers();
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

// ── Quiz history (last 50 sessions) ──────────────────────────────────────────
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
