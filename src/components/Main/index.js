import React, { useState, useEffect } from 'react';
import baseVocab from '../../data/vocab.json';
import { generatePart5, generatePart6, generatePart7, generateVocabQuestions } from '../../services/llm';
import { selectAnswerWords, selectDistractors, ALL_EXAMS, EXAM_LABELS } from '../../services/vocab';
import {
  getWordStats, getExtendedVocab,
  getMasteredCount, getWeakGrammarPoints, getWeakVocabWords,
} from '../../services/storage';
import { shuffle } from '../../utils';

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

// ── Smart sorting (same as before) ───────────────────────────────────────────
function sortVocab(words, stats, masteredSet, includeMastered) {
  return [...words].sort((a, b) => {
    const keyA = a.word.toLowerCase(), keyB = b.word.toLowerCase();
    const mA = !includeMastered && masteredSet.has(keyA);
    const mB = !includeMastered && masteredSet.has(keyB);
    if (mA !== mB) return mA ? 1 : -1;
    const tA = a.frequency_tier || 3, tB = b.frequency_tier || 3;
    if (tA !== tB) return tA - tB;
    const sA = stats[keyA] || {}, sB = stats[keyB] || {};
    const ansA = sA.times_as_answer || 0, ansB = sB.times_as_answer || 0;
    if (ansA !== ansB) return ansA - ansB;
    return (sA.consecutive_corrects || 0) - (sB.consecutive_corrects || 0);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
const Main = ({ onStart, onStartDirect, onStartLoading, onError, errorMsg, onReview, onVocabManager, onSettings }) => {
  const [exam,            setExam]           = useState('TOEIC');
  const [mode,            setMode]           = useState('quiz');
  const [topics,          setTopics]         = useState(['business']);
  const [count,           setCount]          = useState(10);
  const [difficulty,      setDifficulty]     = useState('medium');
  const [includeMastered, setIncludeMastered]= useState(false);
  const [vocabBank,       setVocabBank]      = useState(baseVocab);
  const [masteredCount,   setMasteredCount]  = useState(0);

  useEffect(() => {
    getExtendedVocab().then(ext => {
      setVocabBank(ext.length > 0 ? [...baseVocab, ...ext] : baseVocab);
    });
    getMasteredCount().then(setMasteredCount);
  }, []);

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
      const config     = { mode, topics, count, difficulty, exam };
      const examBank   = vocabBank.filter(w => w.exams?.includes(exam));

      // ── No-LLM modes (instant) ───────────────────────────────────────────
      if (mode === 'defmatch') {
        const stats       = await getWordStats();
        const masteredSet = new Set(Object.entries(stats).filter(([,s])=>s.mastered).map(([k])=>k));
        const sortedBank  = sortVocab(
          examBank.filter(w => w.meaning_zh && w.meaning_zh.length > 3),
          stats, masteredSet, includeMastered
        );
        const answerWords = sortedBank.slice(0, count);
        const distractorPool = examBank.filter(w => w.meaning_zh && w.meaning_zh.length > 3);

        const data = answerWords.map(aw => {
          const wrongs = selectDistractors(aw, distractorPool, exam, 3);
          return {
            word:            aw.word,
            wordId:          aw.id,
            phonetic:        aw.phonetic || '',
            exam,
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
        const masteredSet = new Set(Object.entries(stats).filter(([,s])=>s.mastered).map(([k])=>k));
        const sortedBank  = sortVocab(
          examBank.filter(w => w.meaning_zh && w.meaning_zh.length > 3),
          stats, masteredSet, includeMastered
        );
        const answerWords = sortedBank.slice(0, count);

        const data = answerWords.map(aw => {
          const wrongs = selectDistractors(aw, examBank, exam, 3);
          return {
            meaning:         aw.meaning_zh,
            correct_word:    aw.word,
            wordId:          aw.id,
            phonetic:        aw.phonetic || '',
            exam,
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
        const priorityWords = [
          ...weakWords.slice(0, 5),
          ...selectAnswerWords(
            examBank.filter(w => topics.includes(w.category)),
            stats, 10, { exam }
          ).map(w => w.word),
        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);

        const questions = await generatePart5(count, topics, difficulty, priorityWords, grammarHints, exam);
        onStart('quiz', questions.map(q => ({
          ...q, exam, options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        })), config);

      } else if (mode === 'part6') {
        const data = await generatePart6(topics[0], difficulty, exam);
        onStart('part6', { ...data, exam }, config);

      } else if (mode === 'part7') {
        const data = await generatePart7(topics[0], difficulty, exam);
        data.questions = data.questions.map(q => ({
          ...q, options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        }));
        onStart('part7', { ...data, exam }, config);

      } else if (mode === 'vocab') {
        const stats   = await getWordStats();
        const mastered= new Set(Object.entries(stats).filter(([,s])=>s.mastered).map(([k])=>k));
        const sorted  = sortVocab(examBank, stats, mastered, includeMastered);
        const answers = sorted.slice(0, count);
        const wd      = answers.map(aw => ({
          answerWord:  aw,
          distractors: selectDistractors(aw, examBank, exam, 3),
        }));
        const questions = await generateVocabQuestions(wd, exam, difficulty);
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
            exam,
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
  const examWordCount  = vocabBank.filter(w => w.exams?.includes(exam)).length;
  const isNoLLM        = ['defmatch','reversedrill'].includes(mode);

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 32 }}>
        <div className="home-logo" style={{ padding: 0, textAlign: 'left' }}>
          <h1>Test Drill</h1>
          <p>AI-powered practice for TOEIC · TOEFL · IELTS · GSAT</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSettings}
          style={{ marginTop: 8, fontSize: 18, padding: '4px 10px' }} title="Settings">⚙</button>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid rgba(26,26,26,0.3)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      {/* Exam chips */}
      <div className="config-section">
        <span className="config-label">Exam</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="chip-group">
            {ALL_EXAMS.map(e => (
              <button key={e} className={`chip chip-exam${exam === e ? ' selected' : ''}`} onClick={() => setExam(e)}>
                {EXAM_LABELS[e]}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {examWordCount.toLocaleString()} words
          </span>
        </div>
      </div>

      {/* Mode grid */}
      <div className="config-section">
        <span className="config-label">Mode</span>
        <div className="mode-grid">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card${mode === m.id ? ' selected' : ''}`} onClick={() => setMode(m.id)}>
              {!m.llm && <div className="mode-badge">Instant ✦</div>}
              <div className="mode-title">{m.title}</div>
              <div className="mode-desc">{m.desc}</div>
            </button>
          ))}
        </div>
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

      <hr className="divider" />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" onClick={handleStart}>
          {isNoLLM ? 'Start →' : 'Generate & Start →'}
        </button>
        <button className="btn btn-ghost" onClick={onReview}>Review Notebook</button>
        <button className="btn btn-ghost" onClick={onVocabManager}>
          Vocab Bank ({vocabBank.length.toLocaleString()})
        </button>
      </div>
    </div>
  );
};

export default Main;
