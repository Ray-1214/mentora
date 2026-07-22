import React, { useState, useEffect } from 'react';
import baseVocab from '../../data/vocab.json';
import { generatePart5, generatePart6, generatePart7, generateVocabQuestions } from '../../services/llm';
import { selectAnswerWords, selectDistractors, selectPriorityWords, hasUsableMeaning } from '../../services/vocab';
import {
  getWordStats, getExtendedVocab,
  getMasteredCount, getWeakGrammarPoints, getWeakVocabWords,
  getVocabScope, getCustomVocabLists,
} from '../../services/storage';
import { shuffle } from '../../utils';

// The vocab bank is the CEEC (學測 / GSAT) reference wordlist. This single label
// drives the LLM exam context and the per-question tag now that the multi-exam
// selector is gone (DECISIONS #30).
const BANK_EXAM = '學測';

// ── Mode definitions ──────────────────────────────────────────────────────────
// llm: true = needs LLM call; false = instant local generation
const MODES = [
  { id: 'quiz',         title: 'Grammar Fill',       desc: 'Vocabulary & grammar in context',       llm: true  },
  { id: 'part6',        title: 'Passage Fill',        desc: '3-blank fill in a reading passage',     llm: true  },
  { id: 'part7',        title: 'Reading',             desc: 'Short passage with comprehension',      llm: true  },
  { id: 'vocab',        title: 'Word Drill',          desc: 'Contextual vocabulary sentences',       llm: true  },
  { id: 'defmatch',     title: 'Definition Match',    desc: 'Word → choose the correct meaning',     llm: false },
  { id: 'reversedrill', title: 'Reverse Drill',       desc: 'Definition → choose the correct word',  llm: false },
];

const TOPICS = [
  { id: 'business',   label: 'Business'   },
  { id: 'finance',    label: 'Finance'    },
  { id: 'hr',         label: 'HR'         },
  { id: 'travel',     label: 'Travel'     },
  { id: 'dining',     label: 'Dining'     },
  { id: 'facilities', label: 'Facilities' },
  { id: 'marketing',  label: 'Marketing'  },
  { id: 'technology', label: 'Technology' },
  { id: 'academic',   label: 'Academic'   },
];

const COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [
  { id: 'easy',   label: 'Basic'        },
  { id: 'medium', label: 'Intermediate' },
  { id: 'hard',   label: 'Advanced'     },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Main = ({ onStart, onStartDirect, onStartLoading, onError, errorMsg, onReview, onVocabManager, onCustomVocab, onSettings }) => {
  const [mode,            setMode]           = useState('quiz');
  const [topics,          setTopics]         = useState(TOPICS.map(t => t.id));
  const [count,           setCount]          = useState(10);
  const [difficulty,      setDifficulty]     = useState('medium');
  const [includeMastered, setIncludeMastered]= useState(false);
  const [vocabBank,       setVocabBank]      = useState(baseVocab);
  const [masteredCount,   setMasteredCount]  = useState(0);
  const [scope,           setScope]          = useState({ source: 'builtin', customListId: null });
  const [customLists,     setCustomLists]    = useState([]);
  const [optionsOpen,     setOptionsOpen]    = useState(false);

  useEffect(() => {
    getExtendedVocab().then(ext => {
      setVocabBank(ext.length > 0 ? [...baseVocab, ...ext] : baseVocab);
    });
    getMasteredCount().then(setMasteredCount);
    // Re-read on mount so returning from the My Word Lists page reflects changes.
    getVocabScope().then(setScope);
    getCustomVocabLists().then(setCustomLists);
  }, []);

  // Active custom list (if the scope points at one). When set it replaces the
  // built-in bank as the drill range; the meaning-based modes need Chinese words.
  const activeCustomList = scope.source === 'custom' && scope.customListId
    ? customLists.find(l => l.id === scope.customListId)
    : null;
  const customZhCount = activeCustomList
    ? activeCustomList.words.filter(hasUsableMeaning).length
    : null;
  const meaningModesDisabled = activeCustomList != null && customZhCount === 0;

  const toggleTopic = (id) => {
    setTopics(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev
        : [...prev, id]
    );
  };

  // ── Build question data ───────────────────────────────────────────────────
  const handleStart = async () => {
    const currentMode = MODES.find(m => m.id === mode);
    const isLLM = currentMode?.llm !== false;

    if (isLLM) onStartLoading('Generating questions…');

    try {
      const config     = { mode, topics, count, difficulty, exam: BANK_EXAM };

      // Resolve the active vocab scope. The built-in bank is the single CEEC
      // (學測) wordlist, so there is no exam filtering any more — every mode draws
      // from the whole resolved bank. A custom list simply replaces that bank with
      // its own words. Missing/empty custom list → silently keep the built-in bank.
      const scope = await getVocabScope();
      let activeBank = vocabBank;   // built-in (may already include extendedVocab)
      let usingCustomList = false;
      if (scope.source === 'custom' && scope.customListId) {
        const lists = await getCustomVocabLists();
        const list  = lists.find(l => l.id === scope.customListId);
        if (list && list.words.length > 0) {
          activeBank = list.words;
          usingCustomList = true;
        }
      }
      const examBank = [...activeBank];   // scope-resolved bank; no exam filter

      // Weak vocab from the mistake notebook — routed into the three drills below
      // (higher draw weight). examBank is already scope/exam-resolved.
      const weakVocab = await getWeakVocabWords();

      // ── No-LLM modes (instant) ───────────────────────────────────────────
      if (mode === 'defmatch') {
        const stats       = await getWordStats();
        const answerWords = selectAnswerWords(
          examBank.filter(hasUsableMeaning),
          stats, count, { includeMastered, now: Date.now(), weakWords: weakVocab });
        const distractorPool = examBank.filter(hasUsableMeaning);
        const isCustom = usingCustomList;

        const data = answerWords.map(aw => {
          let wrongs = selectDistractors(aw, distractorPool, null, 3, vocabBank);

          // Custom lists may repeat a Chinese meaning, which would make two
          // options identical and break the string-based answer check. Keep only
          // wrongs whose meaning differs from the correct one and each other,
          // topping up from the pool; tolerate fewer options for tiny lists.
          if (isCustom) {
            const seen = new Set([aw.meaning_zh]);
            const unique = [];
            for (const w of wrongs) {
              if (w.meaning_zh && !seen.has(w.meaning_zh)) { seen.add(w.meaning_zh); unique.push(w); }
            }
            if (unique.length < 3) {
              for (const w of distractorPool.slice().sort(() => Math.random() - 0.5)) {
                if (unique.length >= 3) break;
                if (w.meaning_zh && !seen.has(w.meaning_zh)) { seen.add(w.meaning_zh); unique.push(w); }
              }
            }
            wrongs = unique.length ? unique : wrongs;
          }

          return {
            word:            aw.word,
            wordId:          aw.id,
            phonetic:        aw.phonetic || '',
            exam:            BANK_EXAM,
            correct_meaning: aw.meaning_zh,
            wrong_meanings:  wrongs.map(w => w.meaning_zh),
            distractor_words:wrongs.map(w => w.word),
            options:         shuffle([aw.meaning_zh, ...wrongs.map(w => w.meaning_zh)]),
          };
        });
        onStartDirect('defmatch', data, config);
        return;
      }

      if (mode === 'reversedrill') {
        const stats       = await getWordStats();
        const answerWords = selectAnswerWords(
          examBank.filter(hasUsableMeaning),
          stats, count, { includeMastered, now: Date.now(), weakWords: weakVocab });

        const data = answerWords.map(aw => {
          const wrongs = selectDistractors(aw, examBank, null, 3, vocabBank);
          return {
            meaning:         aw.meaning_zh,
            correct_word:    aw.word,
            wordId:          aw.id,
            phonetic:        aw.phonetic || '',
            exam:            BANK_EXAM,
            distractor_words:wrongs.map(w => w.word),
            distractor_ids:  wrongs.map(w => w.id),
            options:         shuffle([aw.word, ...wrongs.map(w => w.word)]),
          };
        });
        onStartDirect('reversedrill', data, config);
        return;
      }

      // ── LLM modes ────────────────────────────────────────────────────────
      if (mode === 'quiz') {
        const [stats, grammarHints, weakWords] = await Promise.all([
          getWordStats(), getWeakGrammarPoints(), getWeakVocabWords(),
        ]);
        // examBank is already scope-resolved; selectPriorityWords must NOT
        // re-filter by exam (that emptied imported custom words — see vocab.js).
        const priorityWords = selectPriorityWords(examBank, stats, { weakWords, topics, count: 10, cap: 12 });

        const questions = await generatePart5(count, topics, difficulty, priorityWords, grammarHints, BANK_EXAM);
        onStart('quiz', questions.map(q => ({
          ...q, exam: BANK_EXAM, options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        })), config);

      } else if (mode === 'part6') {
        const data = await generatePart6(topics[0], difficulty, BANK_EXAM);
        onStart('part6', { ...data, exam: BANK_EXAM }, config);

      } else if (mode === 'part7') {
        const data = await generatePart7(topics[0], difficulty, BANK_EXAM);
        data.questions = data.questions.map(q => ({
          ...q, options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        }));
        onStart('part7', { ...data, exam: BANK_EXAM }, config);

      } else if (mode === 'vocab') {
        const stats   = await getWordStats();
        const answers = selectAnswerWords(examBank, stats, count,
          { includeMastered, now: Date.now(), weakWords: weakVocab });
        const wd      = answers.map(aw => ({
          answerWord:  aw,
          distractors: selectDistractors(aw, examBank, null, 3, vocabBank),
        }));
        const questions = await generateVocabQuestions(wd, BANK_EXAM, difficulty);
        onStart('vocab', questions.map((q, i) => {
          const aw  = wd[i].answerWord;
          const dst = wd[i].distractors;
          return {
            word: aw.word, wordId: aw.id,
            distractorWords: dst.map(d => d.word),
            question:        q.question || `Fill in: "${aw.word}"`,
            correct_answer:  aw.word,
            incorrect_answers: dst.map(d => d.word),
            options:  shuffle([aw.word, ...dst.map(d => d.word)]),
            explanation:    q.explanation || '',
            meaning_zh:     aw.meaning_zh || '',
            exam:           BANK_EXAM,
          };
        }), config);
      }

    } catch (e) {
      console.error('LLM error:', e);
      onError(`Connection failed: ${e.message || 'Unknown error'}`);
    }
  };

  const showCount      = !['part6', 'part7'].includes(mode);
  const showTopics     = ['quiz', 'vocab'].includes(mode);
  const isNoLLM        = ['defmatch','reversedrill'].includes(mode);

  // Collapsed "Options" summary — only the settings relevant to the current mode
  // (same show/hide conditions as the expanded panel), joined by " · ".
  const difficultyLabel = DIFFICULTY_OPTIONS.find(d => d.id === difficulty)?.label || difficulty;
  const topicsSummary =
    topics.length === TOPICS.length ? 'All topics'
    : topics.length <= 3            ? TOPICS.filter(t => topics.includes(t.id)).map(t => t.label).join(', ')
    :                                 `${topics.length} topics`;
  const scopeSummary = activeCustomList ? `Custom: ${activeCustomList.name}` : 'Built-in bank';
  const optionsSummary = [
    !isNoLLM   && difficultyLabel,
    showCount  && `${count} questions`,
    showTopics && topicsSummary,
    scopeSummary,
  ].filter(Boolean).join(' · ');

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 32 }}>
        <div className="home-logo" style={{ padding: 0, textAlign: 'left' }}>
          <h1>Mentora</h1>
          <p>AI-powered personalized English practice</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSettings}
          style={{ marginTop: 8, fontSize: 18, padding: '4px 10px' }} title="Settings">⚙</button>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid rgba(26,26,26,0.3)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      {/* Mode grid */}
      <div className="config-section">
        <span className="config-label">Mode</span>
        <div className="mode-grid">
          {MODES.map(m => {
            const disabled = meaningModesDisabled && (m.id === 'defmatch' || m.id === 'reversedrill');
            return (
              <button
                key={m.id}
                className={`mode-card${mode === m.id ? ' selected' : ''}`}
                onClick={() => setMode(m.id)}
                disabled={disabled}
                title={disabled ? 'This list has no Chinese translations; only Word Drill is available' : undefined}
              >
                {!m.llm && <div className="mode-badge">Instant ✦</div>}
                <div className="mode-title">{m.title}</div>
                <div className="mode-desc">{disabled ? 'Needs Chinese translations' : m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Options disclosure: one summary line, expandable to the full config ── */}
      {!optionsOpen ? (
        <div className="options-summary">
          <span className="options-summary-text">{optionsSummary}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setOptionsOpen(true)}>
            Customize <span className="options-chevron">▸</span>
          </button>
        </div>
      ) : (
        <div className="options-panel">
          <div className="options-summary">
            <span className="config-label" style={{ margin: 0 }}>Options</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setOptionsOpen(false)}>
              Done <span className="options-chevron">▾</span>
            </button>
          </div>

          {/* Topics */}
          {showTopics && (
            <div className="config-section">
              <span className="config-label">Topics (multi-select)</span>
              <div className="chip-group">
                {TOPICS.map(t => (
                  <button key={t.id} className={`chip${topics.includes(t.id) ? ' selected' : ''}`} onClick={() => toggleTopic(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty */}
          {!isNoLLM && (
            <div className="config-section">
              <span className="config-label">Difficulty</span>
              <div className="chip-group">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d.id} className={`chip${difficulty === d.id ? ' selected' : ''}`} onClick={() => setDifficulty(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Count */}
          {showCount && (
            <div className="config-section">
              <span className="config-label">Questions</span>
              <div className="chip-group">
                {COUNT_OPTIONS.map(n => (
                  <button key={n} className={`chip${count === n ? ' selected' : ''}`} onClick={() => setCount(n)}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Mastered toggle */}
          {['vocab','defmatch','reversedrill'].includes(mode) && masteredCount > 0 && (
            <div className="config-section">
              <span className="config-label">Mastered Words</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className={`chip${includeMastered ? ' selected' : ''}`} onClick={() => setIncludeMastered(v => !v)}>
                  {includeMastered ? '✓ Include mastered' : 'Skip mastered'}
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {masteredCount} mastered
                </span>
              </div>
            </div>
          )}

          {/* Vocab range — status only; the single entry to CustomVocab is the bottom "My Word Lists" button */}
          <div className="config-section">
            <span className="config-label">Vocab Range</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="chip selected" style={{ cursor: 'default' }}>
                {activeCustomList ? `Custom: ${activeCustomList.name}` : 'Built-in bank'}
              </span>
              {activeCustomList && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {activeCustomList.words.length.toLocaleString()} words · exam filter off
                </span>
              )}
            </div>
            {meaningModesDisabled && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                This list has no Chinese translations; only Word Drill is available.
              </p>
            )}
          </div>
        </div>
      )}

      <hr className="divider" />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" onClick={handleStart}>
          {isNoLLM ? 'Start →' : 'Generate & Start →'}
        </button>
        <button className="btn btn-ghost" onClick={onReview}>Review Notebook</button>
        <button className="btn btn-ghost" onClick={onCustomVocab}>My Word Lists</button>
        <button className="btn btn-ghost" onClick={onVocabManager}>
          Vocab Bank ({vocabBank.length.toLocaleString()})
        </button>
      </div>
    </div>
  );
};

export default Main;
