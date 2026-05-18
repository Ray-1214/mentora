import React, { useState, useEffect } from 'react';
import baseVocab from '../../data/vocab.json';
import { generatePart5, generatePart6, generatePart7, generateVocabQuestions } from '../../services/llm';
import { selectAnswerWords, selectDistractors, ALL_EXAMS, EXAM_LABELS } from '../../services/vocab';
import {
  getWordStats, getExtendedVocab,
  getMasteredCount, getWeakGrammarPoints, getWeakVocabWords,
} from '../../services/storage';
import { shuffle } from '../../utils';

const MODES = [
  { id: 'quiz',  label: 'Part 5', title: 'Sentence Completion', desc: 'Grammar & vocabulary fill-in-the-blank' },
  { id: 'part6', label: 'Part 6', title: 'Paragraph Fill',      desc: 'Complete a passage with 3 blanks' },
  { id: 'part7', label: 'Part 7', title: 'Reading Comprehension',desc: 'Short passage + 3 comprehension questions' },
  { id: 'vocab', label: 'Vocab',  title: 'Word Drill',          desc: 'Frequency-ranked vocabulary with smart distractors' },
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
  { id: 'academic',   label: 'Academic' },
];

const COUNT_OPTIONS     = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [
  { id: 'easy',   label: 'Easy (~600)' },
  { id: 'medium', label: 'Medium (~730)' },
  { id: 'hard',   label: 'Hard (~860)' },
];

const Main = ({ onStart, onStartLoading, onError, errorMsg, onReview, onVocabManager, onSettings }) => {
  const [exam,           setExam]           = useState('TOEIC');
  const [mode,           setMode]           = useState('quiz');
  const [themes,         setThemes]         = useState(['business']);
  const [count,          setCount]          = useState(10);
  const [difficulty,     setDifficulty]     = useState('medium');
  const [includeMastered,setIncludeMastered]= useState(false);
  const [vocabBank,      setVocabBank]      = useState(baseVocab);
  const [masteredCount,  setMasteredCount]  = useState(0);

  useEffect(() => {
    getExtendedVocab().then(ext => {
      setVocabBank(ext.length > 0 ? [...baseVocab, ...ext] : baseVocab);
    });
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
      const config = { mode, themes, count, difficulty, exam };

      if (mode === 'quiz') {
        const [stats, grammarHints, weakWords] = await Promise.all([
          getWordStats(),
          getWeakGrammarPoints(),
          getWeakVocabWords(),
        ]);
        // Priority vocab hints for the LLM
        const priorityWords = [
          ...weakWords.slice(0, 5),
          ...selectAnswerWords(
            vocabBank.filter(w => themes.includes(w.category) && w.exams?.includes(exam)),
            stats, 10, { exam }
          ).map(w => w.word),
        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);

        const questions = await generatePart5(count, themes, difficulty, priorityWords, grammarHints, exam);
        onStart('quiz', questions.map(q => ({
          ...q,
          exam,
          options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        })), config);

      } else if (mode === 'part6') {
        const data = await generatePart6(themes[0], difficulty, exam);
        onStart('part6', { ...data, exam }, config);

      } else if (mode === 'part7') {
        const data = await generatePart7(themes[0], difficulty, exam);
        data.questions = data.questions.map(q => ({
          ...q,
          options: shuffle([q.correct_answer, ...q.incorrect_answers]),
        }));
        onStart('part7', { ...data, exam }, config);

      } else if (mode === 'vocab') {
        const stats = await getWordStats();

        // Filter bank by exam
        const examBank = vocabBank.filter(w => w.exams?.includes(exam));

        // Pick answer words (frequency_tier sorted, non-mastered first)
        const answerWords = selectAnswerWords(examBank, stats, count, { exam, includeMastered });

        // For each answer word, pick 3 distractors from same exam bank
        const wordsWithDistractors = answerWords.map(aw => ({
          answerWord:  aw,
          distractors: selectDistractors(aw, examBank, exam, 3),
        }));

        // LLM generates sentences only (options are already selected)
        const questions = await generateVocabQuestions(wordsWithDistractors, exam, difficulty);

        // Merge LLM question text with pre-selected options
        const merged = questions.map((q, i) => {
          const aw   = wordsWithDistractors[i].answerWord;
          const dsts = wordsWithDistractors[i].distractors;
          return {
            word:           aw.word,
            wordId:         aw.id,
            distractorIds:  dsts.map(d => d.id),
            distractorWords:dsts.map(d => d.word),
            question:       q.question  || `Use "${aw.word}" in the sentence: _____`,
            correct_answer: aw.word,
            incorrect_answers: dsts.map(d => d.word),
            options:        shuffle([aw.word, ...dsts.map(d => d.word)]),
            explanation:    q.explanation || '',
            meaning_zh:     aw.meaning_zh || '',
            exam,
          };
        });

        onStart('vocab', merged, config);
      }
    } catch (e) {
      console.error('LLM error:', e);
      onError(`AI connection failed: ${e.message || 'Unknown error'}`);
    }
  };

  const showCount      = mode === 'quiz' || mode === 'vocab';
  const showThemeMulti = mode === 'quiz' || mode === 'vocab';

  // Count words in selected exam
  const examWordCount = vocabBank.filter(w => w.exams?.includes(exam)).length;

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 32 }}>
        <div className="home-logo" style={{ padding: 0, textAlign: 'left' }}>
          <h1>Test Drill</h1>
          <p>多益 · 托福 · 雅思 · 學測 AI 出題</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSettings}
          style={{ marginTop: 8, fontSize: 18, padding: '4px 10px' }} title="Settings">⚙</button>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid #999' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      {/* Exam selector */}
      <div className="config-section">
        <span className="config-label">Exam</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={exam}
            onChange={e => setExam(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontFamily: 'var(--font)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {ALL_EXAMS.map(e => (
              <option key={e} value={e}>{EXAM_LABELS[e]}</option>
            ))}
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {examWordCount.toLocaleString()} words
          </span>
        </div>
      </div>

      {/* Mode */}
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

      {/* Themes */}
      <div className="config-section">
        <span className="config-label">{showThemeMulti ? 'Topics (multi-select)' : 'Topic'}</span>
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

      {/* Difficulty */}
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

      {/* Mastered toggle (vocab mode only) */}
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
        <button className="btn btn-ghost" onClick={onVocabManager}>
          Vocab Bank ({vocabBank.length.toLocaleString()})
        </button>
      </div>
    </div>
  );
};

export default Main;
