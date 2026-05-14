import React, { useState } from 'react';
import { addWrongAnswer } from '../../services/storage';

const LETTERS = ['A', 'B', 'C', 'D'];

const Part7Quiz = ({ data, config, onFinish, onHome }) => {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrongList, setWrongList] = useState([]);

  const questions = data.questions;
  const q = questions[qIdx];
  const total = questions.length;
  const progress = (qIdx / total) * 100;

  const handleSelect = (opt) => { if (!revealed) setSelected(opt); };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_answer;
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType: 'Part 7',
        question: q.question,
        userAnswer: selected,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
        context: data.passage.substring(0, 100) + '…',
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    setRevealed(true);
  };

  const handleNext = () => {
    if (qIdx === total - 1) {
      onFinish({
        total,
        correct,
        wrong: wrongList.length,
        wrongItems: wrongList,
        quizType: 'Part 7',
      });
    } else {
      setQIdx(i => i + 1);
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
        <h1>Part 7 · Reading Comprehension</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-meta">
        <span className="quiz-progress">Q{qIdx + 1} / {total}</span>
        <span className="tag">{data.passage_type || 'Passage'}</span>
      </div>

      {/* Passage always visible */}
      <div className="passage-box">{data.passage}</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="question-text" style={{ fontSize: 16, marginBottom: 20 }}>
          {qIdx + 1}. {q.question}
        </p>
        <div className="options-list" style={{ marginBottom: 0 }}>
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
      </div>

      {revealed && q.explanation && (
        <div className="explanation-box">
          <strong>Explanation: </strong>{q.explanation}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!revealed ? (
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!selected}>
            Confirm
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleNext}>
            {qIdx === total - 1 ? 'See Results' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Part7Quiz;
