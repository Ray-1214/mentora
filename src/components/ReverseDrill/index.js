/**
 * Reverse Drill — see the Chinese meaning, choose the correct English word.
 * No LLM required. Stats: updateWordStats for all 4 words shown.
 */
import React, { useState } from 'react';
import { addWrongAnswer, updateWordStats } from '../../services/storage';
import { EXAM_LABELS } from '../../services/vocab';

const LETTERS = ['A', 'B', 'C', 'D'];

const ReverseDrill = ({ data, config, onFinish, onHome }) => {
  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [wrongList,setWrongList]= useState([]);

  const q     = data[idx];
  const total = data.length;

  const handleSelect = (opt) => { if (!revealed) setSelected(opt); };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_word;

    // All 4 words shown → option_appearance_count +1 for each
    await updateWordStats(q.correct_word, q.distractor_words || [], isCorrect);

    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType:     'Reverse Drill',
        question:     `"${q.meaning}" → which word?`,
        userAnswer:   selected,
        correctAnswer:q.correct_word,
        word:         q.correct_word,
        exam:         q.exam || config.exam || '',
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    setRevealed(true);
  };

  const handleNext = () => {
    if (idx === total - 1) {
      onFinish({ total, correct, wrong: wrongList.length, wrongItems: wrongList, quizType: 'Reverse Drill' });
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const getOptionClass = (opt) => {
    if (!revealed) return selected === opt ? 'option-item selected' : 'option-item';
    if (opt === q.correct_word) return 'option-item correct';
    if (opt === selected && opt !== q.correct_word) return 'option-item wrong';
    return 'option-item';
  };

  const examLabel = q.exam ? EXAM_LABELS[q.exam] || q.exam : '';

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Reverse Drill</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${(idx / total) * 100}%` }} />
      </div>

      <div className="quiz-meta">
        <span className="quiz-progress">{idx + 1} / {total}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {examLabel && <span className="tag">{examLabel}</span>}
          <span className="tag">Instant ✦</span>
        </div>
      </div>

      {/* The meaning being tested */}
      <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          Which English word matches this meaning?
        </p>
        <p style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {q.meaning}
        </p>
      </div>

      <div className="options-list">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className={getOptionClass(opt)}
            onClick={() => handleSelect(opt)}
            disabled={revealed}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            <span style={{ fontStyle: 'italic' }}>{opt}</span>
          </button>
        ))}
      </div>

      {revealed && (
        <div className="explanation-box">
          <strong>{q.correct_word}</strong>
          {q.phonetic && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> [{q.phonetic}]</span>}
          {' — '}{q.meaning}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!revealed ? (
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!selected}>Confirm</button>
        ) : (
          <button className="btn btn-primary" onClick={handleNext}>
            {idx === total - 1 ? 'See Results' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReverseDrill;
