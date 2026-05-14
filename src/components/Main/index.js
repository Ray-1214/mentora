import React, { useState, useEffect } from 'react';
import baseVocab from '../../data/vocab.json';
import { generatePart5, generatePart6, generatePart7, generateVocabQuestions } from '../../services/llm';
import {
  getVocabStats, getExtendedVocab,
  getMasteredIds, getMasteredCount,
  getWeakGrammarPoints, getWeakVocabWords,
} from '../../services/storage';
import { shuffle } from '../../utils';

const MODES = [
  { id: 'quiz',  label: 'Part 5', title: 'Sentence Completion', desc: 'Fill in the blank — grammar & vocabulary' },
  { id: 'part6', label: 'Part 6', title: 'Paragraph Fill',      desc: 'Complete a business passage with 3 blanks' },
  { id: 'part7', label: 'Part 7', title: 'Reading Comprehension',desc: 'Read a short text and answer questions' },
  { id: 'vocab', label: 'Vocab',  title: 'Word Drill',          desc: 'Drill TOEIC vocabulary words' },
];

const THEMES = [
  { id: 'business',   label: 'Business' },
  { id: 'finance',    label: 'Finance' },
  { id: 'hr',         label: 'HR' },
  { id: 'travel',     label: 'Travel' },
  { id: 'dining',     label: 'Dining' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'marketing',  label: 'Marketing' },
  { id: 'technology', label: 'Technology' },
  { id: 'academic',   label: 'Academic (CEEC)' },
];

const COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [
  { id: 'easy',   label: 'Easy (~600)' },
  { id: 'medium', label: 'Medium (~730)' },
  { id: 'hard',   label: 'Hard (~860)' },
];

// Sort vocab by: 1) not mastered first  2) toeic_priority (1=highest)
//               3) least tested  4) worst accuracy
function sortVocab(words, stats, masteredIds, includeMastered) {
  return [...words].sort((a, b) => {
    const idA = String(a.id), idB = String(b.id);
    const mA = masteredIds.has(idA), mB = masteredIds.has(idB);

    // Mastered words go to the end (unless includeMastered selected)
    if (!includeMastered && mA !== mB) return mA ? 1 : -1;

    // TOEIC priority (lower number = more important)
    const pA = a.toeic_priority || 3, pB = b.toeic_priority || 3;
    if (pA !== pB) return pA - pB;

    const sA = stats[a.id] || { times_tested: 0, times_correct: 0 };
    const sB = stats[b.id] || { times_tested: 0, times_correct: 0 };
    // Least tested first
    if (sA.times_tested !== sB.times_tested) return sA.times_tested - sB.times_tested;
    // Worst accuracy first
    const rA = sA.times_tested ? sA.times_correct / sA.times_tested : 0;
    const rB = sB.times_tested ? sB.times_correct / sB.times_tested : 0;
    return rA - rB;
  });
}

const Main = ({ onStart, onStartLoading, onError, errorMsg, onReview, onVocabManager, onSettings }) => {
  const [mode,            setMode]           = useState('quiz');
  const [themes,          setThemes]         = useState(['business']);
  const [count,           setCount]          = useState(10);
  const [difficulty,      setDifficulty]     = useState('medium');
  const [includeMastered, setIncludeMastered]= useState(false);
  const [vocabBank,       setVocabBank]      = useState(baseVocab);
  const [masteredCount,   setMasteredCount]  = useState(0);

  useEffect(() => {
    // Merge extended vocab
    getExtendedVocab().then(ext => {
      if (ext.length > 0) setVocabBank([...baseVocab, ...ext]);
    });
    // Load mastered count for display
    getMasteredCount().then(setMasteredCount);
  }, []);

  const toggleTheme = (id) => {
    setThemes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev
        : [...prev, id]
    );
  };

  const handleStart = async () => {
    onStartLoading('Generating questions with AI…');
    try {
      const config = { mode, themes, count, difficulty };

      if (mode === 'quiz') {
        // Get weak grammar points from recent wrong answers
        const [stats, masteredIds, grammarHints, weakWords] = await Promise.all([
          getVocabStats(),
          getMasteredIds(),
          getWeakGrammarPoints(),
          getWeakVocabWords(),
        ]);
        // Pick top priority words as hints for the LLM
        const relevant = vocabBank.filter(w => themes.includes(w.category));
        const sorted   = sortVocab(relevant, stats, masteredIds, false);
        const priorityWords = [
          ...weakWords.slice(0, 5),
          ...sorted.slice(0, 10).map(w => w.word),
        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);

        const questions = await generatePart5(count, themes, difficulty, priorityWords, grammarHints);
        onStart('quiz', questions.map(q => ({
          ...q,
          options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        })), config);

      } else if (mode === 'part6') {
        const data = await generatePart6(themes[0], difficulty);
        onStart('part6', data, config);

      } else if (mode === 'part7') {
        const data = await generatePart7(themes[0], difficulty);
        data.questions = data.questions.map(q => ({
          ...q,
          options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        }));
        onStart('part7', data, config);

      } else if (mode === 'vocab') {
        const [stats, masteredIds] = await Promise.all([getVocabStats(), getMasteredIds()]);
        const relevant = vocabBank.filter(w => themes.includes(w.category));
        const sorted   = sortVocab(relevant, stats, masteredIds, includeMastered);
        const batch    = sorted.slice(0, count);
        const questions = await generateVocabQuestions(batch, difficulty);
        onStart('vocab', questions.map((q, i) => ({
          ...q,
          wordId:  batch[i]?.id ?? null,
          options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        })), config);
      }
    } catch (e) {
      console.error('LLM error:', e);
      onError(`AI connection failed: ${e.message || 'Unknown error'}`);
    }
  };

  const showCount      = mode === 'quiz' || mode === 'vocab';
  const showThemeMulti = mode === 'quiz' || mode === 'vocab';

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 32 }}>
        <div className="home-logo" style={{ padding: 0, textAlign: 'left' }}>
          <h1>TOEIC Drill</h1>
          <p>AI-powered practice · 多益備考</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSettings}
          style={{ marginTop: 8, fontSize: 18, padding: '4px 10px' }} title="Settings">⚙</button>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid #999' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      <div className="config-section">
        <span className="config-label">Mode</span>
        <div className="mode-grid">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card${mode === m.id ? ' selected' : ''}`} onClick={() => setMode(m.id)}>
              <div className="mode-label">{m.label}</div>
              <div className="mode-title">{m.title}</div>
              <div className="mode-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="config-section">
        <span className="config-label">{showThemeMulti ? 'Themes (multi-select)' : 'Theme'}</span>
        <div className="chip-group">
          {THEMES.map(t => (
            <button key={t.id}
              className={`chip${themes.includes(t.id) ? ' selected' : ''}`}
              onClick={() => showThemeMulti ? toggleTheme(t.id) : setThemes([t.id])}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Mastered toggle — only shown in vocab mode */}
      {mode === 'vocab' && masteredCount > 0 && (
        <div className="config-section">
          <span className="config-label">Mastered Words</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={`chip${includeMastered ? ' selected' : ''}`}
              onClick={() => setIncludeMastered(v => !v)}
            >
              {includeMastered ? '✓ Include mastered' : 'Skip mastered'}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {masteredCount} word{masteredCount !== 1 ? 's' : ''} mastered
            </span>
          </div>
        </div>
      )}

      <hr className="divider" />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" onClick={handleStart}>Start →</button>
        <button className="btn btn-ghost" onClick={onReview}>Review Notebook</button>
        <button className="btn btn-ghost" onClick={onVocabManager}
          title={`Vocab bank: ${vocabBank.length} words`}>
          Vocab Bank ({vocabBank.length})
        </button>
      </div>
    </div>
  );
};

export default Main;
