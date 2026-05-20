import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, DEFAULT_MASTERY_THRESHOLD } from '../../services/storage';

const DEFAULT_SETTINGS = {
  apiBase:          'https://api.ithu.tw/v1',
  apiKey:           '',
  model:            'gpt-oss-120b',
  masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
};

const Settings = ({ onHome, isFirstLaunch }) => {
  const [form,    setForm]    = useState(DEFAULT_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState(null);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    getSettings().then(s => setForm({ ...DEFAULT_SETTINGS, ...s }));
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!form.apiKey) { setTestMsg({ ok: false, msg: 'API Key is required.' }); return; }
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch(`${form.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${form.apiKey}`,
        },
        body: JSON.stringify({
          model: form.model,
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 5,
        }),
      });
      if (res.ok) {
        setTestMsg({ ok: true, msg: 'Connection successful!' });
      } else {
        const text = await res.text();
        setTestMsg({ ok: false, msg: `${res.status}: ${text.slice(0, 120)}` });
      }
    } catch (e) {
      setTestMsg({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>{isFirstLaunch ? 'Setup — API Configuration' : 'Settings'}</h1>
        {!isFirstLaunch && <button className="back-btn" onClick={onHome}>← Home</button>}
      </div>

      {isFirstLaunch && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid #1A1A1A' }}>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>
            Welcome to <strong>Test Drill</strong>. Enter your LLM API settings to get started.
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Tunghai University users: get your API Key at{' '}
              <a href="https://llmapi.service.thu.edu.tw/tutorial" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>llmapi.service.thu.edu.tw</a>
            </span>
          </p>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* API Base URL */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            API Base URL
          </label>
          <input
            type="text"
            value={form.apiBase}
            onChange={e => update('apiBase', e.target.value)}
            placeholder="https://api.ithu.tw/v1"
            style={inputStyle}
          />
        </div>

        {/* API Key */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            API Key
          </label>
          <input
            type="password"
            value={form.apiKey}
            onChange={e => update('apiKey', e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            style={inputStyle}
            autoComplete="off"
          />
        </div>

        {/* Model */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            Model
          </label>
          <input
            type="text"
            value={form.model}
            onChange={e => update('model', e.target.value)}
            placeholder="gpt-oss-120b"
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            THU available: gpt-oss-120b · Llama-4-Scout-17B-16E-Instruct-FP8 · Nemotron-3-Nano-Omni-30B
          </p>
        </div>

        {/* Mastery threshold */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            Word Mastery Threshold
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={3} max={15} step={1}
              value={form.masteryThreshold ?? DEFAULT_MASTERY_THRESHOLD}
              onChange={e => update('masteryThreshold', parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, minWidth: 28 }}>
              {form.masteryThreshold ?? DEFAULT_MASTERY_THRESHOLD}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Answer a word correctly this many times to mark it as mastered (skip in future drills).
          </p>
        </div>

        {/* Test result */}
        {testMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: testMsg.ok ? 'var(--tag-bg)' : '#fafafa',
            border: `1px solid ${testMsg.ok ? 'var(--border)' : '#ddd'}`,
            fontSize: 13,
            color: testMsg.ok ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {testMsg.ok ? '✓ ' : '✗ '}{testMsg.msg}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.apiKey}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !form.apiKey}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          {!isFirstLaunch && (
            <button className="btn btn-ghost" onClick={onHome}>Cancel</button>
          )}
        </div>

        {isFirstLaunch && saved && (
          <button className="btn btn-primary btn-lg" onClick={onHome} style={{ marginTop: 4 }}>
            Start Using Test Drill →
          </button>
        )}
      </div>

      {/* Vocab bank info */}
      <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--tag-bg)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text-primary)' }}>About the Vocabulary Bank</strong><br />
        Ships with <strong>~20,000 words</strong> across TOEIC · TOEFL · IELTS · 學測.<br />
        Vocab Drill selects words by <em>frequency tier</em> — most important first.<br />
        <span style={{ color: 'var(--text-muted)' }}>Mastered words (consecutive correct ≥ threshold) are skipped automatically.</span>
      </div>
    </div>
  );
};

// Input styles are handled by global CSS (input[type="text"], input[type="password"])
const inputStyle = {};

export default Settings;
