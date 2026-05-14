import React from 'react';
import { addQuizSession } from '../../services/storage';

const SCORE_BANDS = [
  { min: 0.90, label: '860+', desc: 'Outstanding — near native proficiency' },
  { min: 0.75, label: '730–860', desc: 'Advanced — comfortable in most business contexts' },
  { min: 0.60, label: '600–730', desc: 'Upper-Intermediate — handles most workplace situations' },
  { min: 0.45, label: '470–600', desc: 'Intermediate — improving, keep drilling' },
  { min: 0,    label: 'Below 470', desc: 'Foundation — focus on vocabulary and grammar basics' },
];

const getBand = (pct) => SCORE_BANDS.find(b => pct >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];

const Result = ({ data, onHome, onReview, onRetry }) => {
  const { total, correct, wrong, wrongItems = [], quizType } = data;
  const pct = total > 0 ? correct / total : 0;
  const band = getBand(pct);

  // Save session on mount (once)
  React.useEffect(() => {
    addQuizSession({ quizType, total, correct, wrong });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Results · {quizType}</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      <div className="result-hero">
        <div className="result-score">{Math.round(pct * 100)}%</div>
        <div className="result-score-label">{correct} correct out of {total}</div>
        <div className="result-band">{band.label}</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>{band.desc}</p>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num">{correct}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{wrong}</div>
          <div className="stat-label">Wrong</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{total - correct - wrong}</div>
          <div className="stat-label">Skipped</div>
        </div>
      </div>

      {wrongItems.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Wrong Answers
          </p>
          {wrongItems.map((item, i) => (
            <div key={i} className="review-item">
              <div className="review-item-q">{item.question}</div>
              <div className="review-item-answers">
                <span>
                  <span className="review-answer-label">Your answer:</span>
                  <span className="review-wrong">{item.userAnswer}</span>
                </span>
                <span>
                  <span className="review-answer-label">Correct:</span>
                  <span className="review-correct">{item.correctAnswer}</span>
                </span>
              </div>
              {item.explanation && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{item.explanation}</p>
              )}
            </div>
          ))}
        </>
      )}

      <div className="result-actions">
        <button className="btn btn-primary btn-lg" onClick={onHome}>New Quiz</button>
        <button className="btn btn-secondary" onClick={onReview}>Review Notebook</button>
        {onRetry && (
          <button className="btn btn-ghost" onClick={onRetry}>Retry Same Mode</button>
        )}
      </div>
    </div>
  );
};

export default Result;
