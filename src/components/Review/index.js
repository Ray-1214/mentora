import React, { useEffect, useState } from 'react';
import { getWrongAnswers, removeWrongAnswer, clearWrongAnswers } from '../../services/storage';

// Build Anki-compatible TSV string
// Format: #separator:tab  #html:true  Front\tBack\tTags
function buildAnkiTSV(items) {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    '#deck:TOEIC Drill',
    '#tags column:3',
  ];

  items.forEach(item => {
    const type = (item.quizType || 'TOEIC').replace(/\s+/g, '_');
    const tag  = `toeic-drill ${type.toLowerCase()}${item.word ? ` ${item.word}` : ''}`;

    let front, back;

    if (item.quizType === 'Vocabulary' && item.word) {
      // Vocab card: word on front
      front = `<b>${item.word}</b>`;
      back  = [
        item.correctAnswer && `<b>${item.correctAnswer}</b>`,
        item.explanation   && `<i>${item.explanation}</i>`,
        item.question      && `<hr>Example context:<br>${item.question.replace('_____', `<u>${item.correctAnswer}</u>`)}`,
      ].filter(Boolean).join('<br><br>');
    } else {
      // Part 5/6/7: question on front
      front = item.question
        ? item.question.replace('_____', '<span style="border-bottom:2px solid black">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>')
        : '(no question)';
      back  = [
        `<b>✓ ${item.correctAnswer}</b>`,
        item.userAnswer   && `<span style="color:#888">✗ Your answer: ${item.userAnswer}</span>`,
        item.explanation  && `<hr>${item.explanation}`,
        item.context      && `<hr><small>${item.context}</small>`,
      ].filter(Boolean).join('<br>');
    }

    // Escape tabs and newlines inside fields
    const escape = (s) => s.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    lines.push([escape(front), escape(back), escape(tag)].join('\t'));
  });

  return lines.join('\n');
}

const Review = ({ onHome }) => {
  const [items,    setItems]    = useState([]);
  const [filter,   setFilter]   = useState('All');
  const [exporting,setExporting]= useState(false);
  const [exportMsg,setExportMsg]= useState('');

  useEffect(() => {
    getWrongAnswers().then(setItems);
  }, []);

  const types    = ['All', ...Array.from(new Set(items.map(i => i.quizType)))];
  const filtered = filter === 'All' ? items : items.filter(i => i.quizType === filter);

  const handleRemove = async (globalIdx) => {
    await removeWrongAnswer(globalIdx);
    setItems(await getWrongAnswers());
  };

  const handleClear = async () => {
    await clearWrongAnswers();
    setItems([]);
    setExportMsg('');
  };

  const handleExportAnki = async () => {
    const source = filter === 'All' ? items : filtered;
    if (source.length === 0) return;

    const tsv      = buildAnkiTSV(source);
    const filename = `TOEIC-Drill-${filter.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.txt`;

    if (window.electronAPI?.saveFile) {
      setExporting(true);
      const result = await window.electronAPI.saveFile({ defaultName: filename, content: tsv });
      setExporting(false);
      setExportMsg(result.ok ? `Saved to ${result.filePath}` : 'Export cancelled.');
    } else {
      // Browser fallback: trigger download
      const blob = new Blob([tsv], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('File downloaded.');
    }
    setTimeout(() => setExportMsg(''), 4000);
  };

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Review Notebook</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Your notebook is empty.</p>
          <p style={{ fontSize: 13 }}>Wrong answers appear here automatically after each quiz.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="nav-tabs" style={{ border: 'none', marginBottom: 0 }}>
              {types.map(t => (
                <button key={t} className={`nav-tab${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportAnki}
                disabled={exporting || filtered.length === 0}
                title="Export to Anki (import the .txt into Anki Desktop via File → Import)"
              >
                {exporting ? 'Exporting…' : 'Export to Anki'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleClear} style={{ color: 'var(--text-muted)' }}>
                Clear All
              </button>
            </div>
          </div>

          {exportMsg && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{exportMsg}</p>
          )}

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            {filter !== 'All' && ` in ${filter}`}
          </p>

          {filtered.map((item, i) => {
            const globalIdx = items.indexOf(item);
            return (
              <div key={i} className="review-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="tag">{item.quizType}</span>
                      {item.word && <span className="tag tag-dark">{item.word}</span>}
                    </div>
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
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                        {item.explanation}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemove(globalIdx)}
                    style={{ flexShrink: 0, fontSize: 16, padding: '4px 8px' }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {/* Anki import instructions */}
          <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--tag-bg)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text-primary)' }}>How to import into Anki Desktop:</strong><br />
            1. Click <b>Export to Anki</b> → save the <code>.txt</code> file<br />
            2. Open Anki → <b>File → Import</b> → select the file<br />
            3. Make sure <b>Type: Basic</b>, <b>Deck: TOEIC Drill</b>, <b>Fields: Tab separated</b><br />
            4. Click Import — cards are ready to review
          </div>
        </>
      )}
    </div>
  );
};

export default Review;
