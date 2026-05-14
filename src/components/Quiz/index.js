import React, { useState } from 'react';
import { addWrongAnswer } from '../../services/storage';

const LETTERS = ['A', 'B', 'C', 'D'];

const Quiz = ({ data, config, onFinish, onHome }) => {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrongList, setWrongList] = useState([]);

  const q = data[idx];
  const progress = ((idx) / data.length) * 100;

  const handleSelect = (opt) => {
    if (revealed) return;
    setSelected(opt);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_answer;
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType: 'Part 5',
        question: q.question,
        userAnswer: selected,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    setRevealed(true);
  };

  const handleNext = () => {
    if (idx === data.length - 1) {
      onFinish({
        total: data.length,
        correct,
        wrong: wrongList.length + (selected !== q.correct_answer ? 1 : 0),
        wrongItems: wrongList,
        quizType: 'Part 5',
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

  // Render question with blank
  const renderQuestion = (text) => {
    const parts = text.split('_____');
    if (parts.length < 2) return <span>{text}</span>;
    return (
      <>
        {parts[0]}
        <span className="question-blank">
          {revealed ? q.correct_answer : '　　　　'}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Part 5 · Sentence Completion</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-meta">
        <span className="quiz-progress">{idx + 1} / {data.length}</span>
        <span className="tag">{config.difficulty}</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="question-text">{renderQuestion(q.question)}</p>
        {q.grammar_point && <span className="tag">{q.grammar_point}</span>}
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
            {idx === data.length - 1 ? 'See Results' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Quiz;
