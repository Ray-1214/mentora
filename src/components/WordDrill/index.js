import React, { useState } from 'react';
import { addWrongAnswer, updateWordStats } from '../../services/storage';
import { EXAM_LABELS } from '../../services/vocab';

const LETTERS = ['A', 'B', 'C', 'D'];

const WordDrill = ({ data, config, onFinish, onHome }) => {
  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [wrongList,setWrongList]= useState([]);

  const q     = data[idx];
  const total = data.length;
  const progress = (idx / total) * 100;

  const handleSelect = (opt) => { if (!revealed) setSelected(opt); };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_answer;

    // Update stats for ALL 4 options shown (answer + 3 distractors)
    // This tracks option_appearance_count for every word seen, and
    // consecutive_corrects / reset logic for the answer word.
    await updateWordStats(
      q.correct_answer,
      q.distractorWords || q.incorrect_answers || [],
      isCorrect
    );

    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType:     'Vocabulary',
        question:     q.question,
        userAnswer:   selected,
        correctAnswer:q.correct_answer,
        explanation:  q.explanation || '',
        word:         q.word || q.correct_answer,
        exam:         q.exam || config.exam || '',
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    setRevealed(true);
  };

  const handleNext = () => {
    if (idx === total - 1) {
      onFinish({ total, correct, wrong: wrongList.length, wrongItems: wrongList, quizType: 'Vocabulary' });
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const getOptionClass = (opt) => {
    if (!revealed) return selected === opt ? 'option-item selected' : 'option-item';
    if (opt === q.correct_answer) return 'option-item correct';
    if (opt === selected && opt !== q.correct_answer) return 'option-item wrong';
    return 'option-item';
  };

  const examLabel = q.exam ? EXAM_LABELS[q.exam] || q.exam : '';

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Vocabulary Drill</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-meta">
        <span className="quiz-progress">{idx + 1} / {total}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {examLabel && <span className="tag">{examLabel}</span>}
          {q.word && <span className="tag tag-dark">{q.word}</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="question-text">{q.question}</p>
        {q.meaning_zh && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
            hint: {q.meaning_zh}
          </p>
        )}
      </div>

      <div className="options-list">
        {q.options.map((opt, i) => (
          <button
            key={opt}
            className={getOptionClass(opt)}
            onClick={() => handleSelect(opt)}
            disabled={revealed}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            {opt}
          </button>
        ))}
      </div>

      {revealed && (
        <div className="explanation-box">
          {q.meaning_zh && <p style={{ marginBottom: 6 }}><strong>{q.correct_answer}</strong> — {q.meaning_zh}</p>}
          {q.explanation && <p>{q.explanation}</p>}
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

export default WordDrill;
