import React, { useState, useEffect } from 'react';
import baseVocab from '../../data/vocab.json';
import { generateVocabBatch } from '../../services/llm';
import { getExtendedVocab, appendExtendedVocab, clearExtendedVocab } from '../../services/storage';

const LEVELS = [
  { id: 'basic',    label: 'Basic',    desc: 'TOEIC 400–600' },
  { id: 'mid',      label: 'Mid',      desc: 'TOEIC 600–730' },
  { id: 'advanced', label: 'Advanced', desc: 'TOEIC 730–860' },
  { id: 'expert',   label: 'Expert',   desc: 'TOEIC 860–990' },
];

const CATEGORIES = [
  'business','finance','hr','travel','dining','facilities','marketing','technology',
];

const BATCH_SIZE = 50;
const TARGET = 25000;  // now targeting cross-exam total

const VocabManager = ({ onHome }) => {
  const [extended, setExtended]   = useState([]);
  const [level,    setLevel]      = useState('advanced');
  const [category, setCategory]   = useState('business');
  const [running,  setRunning]    = useState(false);
  const [log,      setLog]        = useState([]);
  const [autoMode, setAutoMode]   = useState(false);

  useEffect(() => {
    getExtendedVocab().then(setExtended);
  }, []);

  const total       = baseVocab.length + extended.length;
  const pct         = Math.min(100, Math.round((total / TARGET) * 100));
  const addLog = (msg) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);

  const generateBatch = async (lvl, cat) => {
    const existing = [...baseVocab, ...extended].map(w => w.word);
    addLog(`Generating ${BATCH_SIZE} ${lvl}/${cat} words…`);
    const newWords = await generateVocabBatch(lvl, cat, existing, BATCH_SIZE);
    const merged   = await appendExtendedVocab(newWords);
    setExtended(merged);
    addLog(`Added ${newWords.length} words. Total: ${baseVocab.length + merged.length}`);
    return merged;
  };

  const handleGenerate = async () => {
    setRunning(true);
    try {
      await generateBatch(level, category);
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
    setRunning(false);
  };

  // Auto-fill all categories & levels until target is reached
  const handleAutoFill = async () => {
    setRunning(true);
    setAutoMode(true);
    const levels = ['basic','mid','advanced','expert'];
    let current = [...baseVocab, ...(await getExtendedVocab())];
    let round = 0;

    try {
      while (current.length < TARGET) {
        const lvl = levels[round % levels.length];
        const cat = CATEGORIES[Math.floor(round / levels.length) % CATEGORIES.length];
        addLog(`Auto round ${round + 1}: ${lvl}/${cat} (${current.length}/${TARGET})`);
        const merged = await generateBatch(lvl, cat);
        current = [...baseVocab, ...merged];
        round++;
        // Small delay to respect rate limits (60 RPM)
        await new Promise(r => setTimeout(r, 1200));
      }
      addLog(`✓ Target reached: ${current.length} words`);
    } catch (e) {
      addLog(`Auto-fill stopped: ${e.message}`);
    }
    setRunning(false);
    setAutoMode(false);
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all generated words? The base 360 words remain.')) return;
    await clearExtendedVocab();
    setExtended([]);
    setLog([]);
    addLog('Extended vocab cleared.');
  };

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>Vocab Bank Manager</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>{total.toLocaleString()} / {TARGET.toLocaleString()} words</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pct}% of target</span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Base: {baseVocab.length}</span>
          <span>Generated: {extended.length}</span>
          <span>Remaining: {Math.max(0, TARGET - total).toLocaleString()}</span>
        </div>
      </div>

      {/* Manual generate */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Generate a Batch ({BATCH_SIZE} words)</p>

        <span className="config-label">Level</span>
        <div className="chip-group" style={{ marginBottom: 12 }}>
          {LEVELS.map(l => (
            <button
              key={l.id}
              className={`chip${level === l.id ? ' selected' : ''}`}
              onClick={() => setLevel(l.id)}
              disabled={running}
            >
              {l.label} <span style={{ fontSize: 11, opacity: 0.7 }}>({l.desc})</span>
            </button>
          ))}
        </div>

        <span className="config-label">Category</span>
        <div className="chip-group" style={{ marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`chip${category === c ? ' selected' : ''}`}
              onClick={() => setCategory(c)}
              disabled={running}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={running}>
            {running && !autoMode ? 'Generating…' : `+ ${BATCH_SIZE} Words`}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleAutoFill}
            disabled={running || total >= TARGET}
            title={`Auto-generate until ${TARGET.toLocaleString()} words`}
          >
            {autoMode ? 'Auto-filling…' : `Auto-fill to ${TARGET.toLocaleString()}`}
          </button>
          <button className="btn btn-ghost" onClick={handleClear} disabled={running}>
            Clear Generated
          </button>
        </div>
        {autoMode && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Auto-filling… this will take several minutes. Do not close the app.
          </p>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Activity Log</p>
          <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabManager;
