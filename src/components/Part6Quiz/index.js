import React, { useState } from 'react';
import { addWrongAnswer } from '../../services/storage';

const LETTERS = ['A', 'B', 'C', 'D'];

const Part6Quiz = ({ data, config, onFinish, onHome }) => {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrongList, setWrongList] = useState([]);
  const [answers, setAnswers] = useState({});

  const questions = data.questions;
  const q = questions[qIdx];
  const total = questions.length;
  const progress = (qIdx / total) * 100;

  // Build passage with filled/active blanks highlighted
  const renderPassage = () => {
    let text = data.passage;
    for (let i = 1; i <= total; i++) {
      const filled = answers[i];
      const isCurrent = i === q.blank;
      let replacement;
      if (filled) {
        replacement = `<DONE_${i}>`;
      } else if (isCurrent) {
        replacement = `<ACTIVE_${i}>`;
      } else {
        replacement = `[${i}]`;
      }
      text = text.replace(`[${i}]`, replacement);
    }
    // Split and render
    const parts = text.split(/(<DONE_\d+>|<ACTIVE_\d+>|\[\d+\])/);
    return parts.map((part, idx) => {
      const doneMatch = part.match(/^<DONE_(\d+)>$/);
      const activeMatch = part.match(/^<ACTIVE_(\d+)>$/);
      if (doneMatch) {
        const n = parseInt(doneMatch[1]);
        return <span key={idx} className="passage-blank-done">{answers[n]}</span>;
      }
      if (activeMatch) {
        const n = parseInt(activeMatch[1]);
        return <span key={idx} className="passage-blank-active">[{n}]</span>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const getOpts = () => {
    if (!q.options) {
      const opts = [q.correct_answer, ...q.incorrect_answers];
      return opts.sort(() => Math.random() - 0.5);
    }
    return q.options;
  };

  const opts = getOpts();

  const handleSelect = (opt) => { if (!revealed) setSelected(opt); };

  const handleConfirm = async () => {
    if (!selected) return;
    const isCorrect = selected === q.correct_answer;
    if (isCorrect) {
      setCorrect(c => c + 1);
    } else {
      const entry = {
        quizType: 'Part 6',
        question: `[Blank ${q.blank}] ${data.passage.substring(0, 80)}…`,
        userAnswer: selected,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
      };
      setWrongList(p => [...p, entry]);
      await addWrongAnswer(entry);
    }
    setAnswers(prev => ({ ...prev, [q.blank]: q.correct_answer }));
    setRevealed(true);
  };

  const handleNext = () => {
    if (qIdx === total - 1) {
      onFinish({
        total,
        correct,
        wrong: wrongList.length,
        wrongItems: wrongList,
        quizType: 'Part 6',
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
        <h1>Part 6 · Paragraph Fill</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-meta">
        <span className="quiz-progress">Blank {qIdx + 1} / {total}</span>
        <span className="tag">{data.passage_type || 'Document'}</span>
      </div>

      <div className="passage-box">{renderPassage()}</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
          Choose the best word for blank [{q.blank}]:
        </p>
        <div className="options-list" style={{ marginBottom: 0 }}>
          {opts.map((opt, i) => (
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
            {qIdx === total - 1 ? 'See Results' : 'Next Blank →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Part6Quiz;
