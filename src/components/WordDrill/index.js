import React, { useState } from 'react';
import { addWrongAnswer, updateVocabStats } from '../../services/storage';

const LETTERS = ['A', 'B', 'C', 'D'];

const WordDrill = ({ data, config, onFinish, onHome }) => {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrongList, setWrongList] = useState([]);

  const q = data[idx];
  const total = data.length;
  const progress = (idx / total) * 100;

  const handleSelect = (opt) => { if (!revealed) setSelected(opt); };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_answer;
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType: 'Vocabulary',
        question: q.question,
        userAnswer: selected,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
        word: q.word,
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    if (q.wordId) await updateVocabStats(q.wordId, isCorrect);
    setRevealed(true);
  };

  const handleNext = () => {
    if (idx === total - 1) {
      onFinish({
        total,
        correct,
        wrong: wrongList.length,
        wrongItems: wrongList,
        quizType: 'Vocabulary',
      });
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
        {q.word && <span className="tag tag-dark">{q.word}</span>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="question-text">{q.question}</p>
        {q.meaning_zh && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -12 }}>
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
          {q.example && <p style={{ marginBottom: 8 }}><strong>Example:</strong> {q.example}</p>}
          {q.explanation && <p><strong>Note:</strong> {q.explanation}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!revealed ? (
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!selected}>
            Confirm
          </button>
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
