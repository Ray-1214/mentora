/**
 * My Word Lists — create user-named vocab lists, paste-import words, and pick
 * one as the active drill range. Separate from the Vocab Bank Manager (which
 * grows the built-in bank via LLM); this is user-owned lists behind a distinct
 * storage key. All logic lives in services (storage.js / vocabImport.js).
 */
import React, { useState, useEffect } from 'react';
import {
  getCustomVocabLists, createCustomVocabList, importWordsToList,
  deleteCustomVocabList, getVocabScope, setVocabScope,
} from '../../services/storage.js';
import { parseVocabText } from '../../services/vocabImport.js';

// A word can be drilled in the meaning-based modes only if it has a usable
// Chinese meaning — same >3 gate the drill branches use.
const hasZh = (w) => w.meaning_zh && w.meaning_zh.length > 3;

const CustomVocab = ({ onHome }) => {
  const [lists,    setLists]    = useState([]);
  const [scope,    setScope]    = useState({ source: 'builtin', customListId: null });
  const [newName,  setNewName]  = useState('');
  const [targetId, setTargetId] = useState(null);  // list the import textarea writes to
  const [raw,      setRaw]      = useState('');
  const [msg,      setMsg]      = useState('');

  useEffect(() => {
    getCustomVocabLists().then(ls => {
      setLists(ls);
      setTargetId(ls[0]?.id ?? null);
    });
    getVocabScope().then(setScope);
  }, []);

  const refresh = async () => setLists(await getCustomVocabLists());

  const handleCreate = async () => {
    const list = await createCustomVocabList(newName);
    setNewName('');
    await refresh();
    setTargetId(list.id);
    setMsg(`Created "${list.name}".`);
  };

  const handleImport = async () => {
    if (!targetId) { setMsg('Create or pick a list first.'); return; }
    const parsed = parseVocabText(raw);
    if (parsed.length === 0) { setMsg('No words found in the pasted text.'); return; }
    const before  = lists.find(l => l.id === targetId)?.words.length || 0;
    const updated = await importWordsToList(targetId, parsed);
    await refresh();
    const added = updated.words.length - before;
    setRaw('');
    setMsg(`Imported ${added} word${added === 1 ? '' : 's'} (after de-dupe) into "${updated.name}".`);
  };

  const handleUseAsRange = async (id) => {
    setScope(await setVocabScope({ source: 'custom', customListId: id }));
  };

  const handleRestoreBuiltin = async () => {
    setScope(await setVocabScope({ source: 'builtin', customListId: null }));
  };

  const handleDelete = async (list) => {
    if (!window.confirm(`Delete "${list.name}"? This can't be undone.`)) return;
    await deleteCustomVocabList(list.id);
    // If the deleted list was the active range, fall back to built-in.
    if (scope.source === 'custom' && scope.customListId === list.id) await handleRestoreBuiltin();
    if (targetId === list.id) setTargetId(null);
    await refresh();
  };

  const activeName = scope.source === 'custom' && scope.customListId
    ? (lists.find(l => l.id === scope.customListId)?.name || 'Custom list')
    : 'Built-in bank';

  const textareaStyle = {
    width: '100%', minHeight: 160, resize: 'vertical',
    background: 'var(--glass)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
    fontFamily: 'monospace', fontSize: 13, padding: '10px 12px', outline: 'none',
  };

  return (
    <div className="app-shell fade-in">
      <div className="page-header">
        <h1>My Word Lists</h1>
        <button className="back-btn" onClick={onHome}>← Home</button>
      </div>

      {/* Current range */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Current drill range: <strong>{activeName}</strong></span>
        {scope.source === 'custom' && (
          <button className="btn btn-ghost btn-sm" onClick={handleRestoreBuiltin}>Restore built-in</button>
        )}
      </div>

      {/* Create */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Create a list</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="List name (e.g. Unit 5 vocab)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleCreate}>+ Create</button>
        </div>
      </div>

      {/* Lists */}
      {lists.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Your lists</p>
          {lists.map(l => {
            const active = scope.source === 'custom' && scope.customListId === l.id;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {l.name}
                    {active && <span className="tag" style={{ marginLeft: 8 }}>Active range</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {l.words.length} words · {l.words.filter(hasZh).length} with Chinese · {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    className={`btn btn-sm ${targetId === l.id ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setTargetId(l.id)}
                  >
                    {targetId === l.id ? 'Importing ↓' : 'Import to'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleUseAsRange(l.id)} disabled={active || l.words.length === 0}>
                    {active ? 'In use' : 'Use as range'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(l)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import */}
      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: 8 }}>
          Import words
          {targetId && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {' → '}{lists.find(l => l.id === targetId)?.name}
            </span>
          )}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
          One word per line. Optionally add a Chinese meaning after the word with a comma or Tab
          (e.g. <span style={{ fontFamily: 'monospace' }}>diligent, 勤勉的</span>). Don't include a header row.
        </p>
        <textarea
          placeholder={'diligent, 勤勉的\nconcise, 簡潔的\nubiquitous'}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          style={textareaStyle}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleImport} disabled={!targetId || !raw.trim()}>
            Import
          </button>
          {msg && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
};

export default CustomVocab;
