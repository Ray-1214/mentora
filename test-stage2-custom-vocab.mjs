#!/usr/bin/env node
/**
 * test-stage2-custom-vocab.mjs
 * Stage 2 acceptance + regression — 自訂單字範圍 / 匯入.
 *
 * 用法:放在 repo 根目錄(與 src/ 同層),然後:
 *     node test-stage2-custom-vocab.mjs
 * 需要 Node 14+(原生 ESM + 動態 import)。全綠 → exit 0;有任一失敗 → exit 1。
 *
 * 這份腳本驗「邏輯層」(全部對真實 src/ 檔案跑,非 mock):
 *   A. parseVocabText            (src/services/vocabImport.js) — 純函式
 *   B. selectDistractors 的 fallbackBank  (src/services/vocab.js) — 純函式
 *   C. customVocabLists / vocabScope 六個 storage 函式 (src/services/storage.js)
 *
 * 不驗(node 無法 import,屬 UI/接線層,見同批訊息的手動清單 M1–M5):
 *   - Main/index.js 是否真的把 scope 解析成 activeBank/activeExam 並傳進三個 drill
 *   - sortVocab(Main 內私有區域函式,不可 import)
 *   - 純英文自訂表時 defmatch/reversedrill 在首頁被 disable
 *   本腳本刻意不碰 selectAnswerWords:Stage 2 未改它,且 drills 不呼叫它(走 sortVocab)。
 *
 * storage.js 在 module 載入時會讀 window.electronAPI,故在「動態 import 之前」先
 * polyfill 一個沒有 electronAPI 的 window(→ 走 localStorage 分支)+ 記憶體 localStorage,
 * 讓真正的 storage 函式在 node 裡實跑。
 */

// ── polyfill(務必在任何 import() 之前執行)───────────────────────────────────
const store = new Map();
globalThis.window = {}; // 無 electronAPI → storage.js 的 isElectron=false → 走 localStorage
globalThis.localStorage = {
  getItem:    (k) => (store.has(k) ? store.get(k) : null),
  setItem:    (k, v) => { store.set(k, v); },
  removeItem: (k) => { store.delete(k); },
};

// ── 極簡 runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, message: e.message });
    console.log(`  \u2717 ${name}\n      ${e.message}`);
  }
}
function group(title) { console.log(`\n${title}`); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'not equal'} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// 建自訂/內建 word 物件的 helper(模擬 parseVocabText 正規化後 / vocab.json 的形狀)
const W = (word, over = {}) => ({ word, pos: '', meaning_zh: '', exams: [], frequency_tier: 2, ...over });
const lower = (arr) => new Set(arr.map((w) => w.word.toLowerCase()));

async function main() {
  // 全部動態 import(在 polyfill 之後),且帶 .js 副檔名(原生 ESM 需要)
  const { parseVocabText } = await import('./src/services/vocabImport.js');
  const { selectDistractors } = await import('./src/services/vocab.js');
  const storage = await import('./src/services/storage.js');

  // preflight:必要匯出存在,否則後面全是雜訊
  group('Preflight — 必要匯出存在');
  await test('parseVocabText 是函式', () => assert(typeof parseVocabText === 'function'));
  await test('selectDistractors 是函式', () => assert(typeof selectDistractors === 'function'));
  for (const fn of ['getCustomVocabLists', 'createCustomVocabList', 'importWordsToList',
                    'deleteCustomVocabList', 'getVocabScope', 'setVocabScope']) {
    await test(`storage.${fn} 是函式`, () => assert(typeof storage[fn] === 'function', `${fn} 未匯出或非函式`));
  }

  const only = (raw) => parseVocabText(raw)[0];

  // ── A. parseVocabText ───────────────────────────────────────────────────────
  group('A. parseVocabText — 純函式(分隔符 / trim / 略過 / 去重 / 正規化)');

  await test('A1 無分隔符 → 整行當 word,meaning_zh 空', () => {
    const w = only('serendipity');
    eq(w.word, 'serendipity', 'word'); eq(w.meaning_zh, '', 'meaning_zh');
  });
  await test('A2 半形逗號分隔', () => {
    const w = only('ubiquitous,\u7121\u6240\u4e0d\u5728');
    eq(w.word, 'ubiquitous', 'word'); eq(w.meaning_zh, '\u7121\u6240\u4e0d\u5728', 'meaning_zh');
  });
  await test('A3 Tab 分隔', () => {
    const w = only('mitigate\t\u6e1b\u8f15');
    eq(w.word, 'mitigate', 'word'); eq(w.meaning_zh, '\u6e1b\u8f15', 'meaning_zh');
  });
  await test('A4 全形逗號分隔', () => {
    const w = only('resilient\uff0c\u6709\u5f48\u6027\u7684');
    eq(w.word, 'resilient', 'word'); eq(w.meaning_zh, '\u6709\u5f48\u6027\u7684', 'meaning_zh');
  });
  await test('A5 半形冒號分隔', () => {
    const w = only('pragmatic:\u52d9\u5be6\u7684');
    eq(w.word, 'pragmatic', 'word'); eq(w.meaning_zh, '\u52d9\u5be6\u7684', 'meaning_zh');
  });
  await test('A6a 最先出現者切:冒號在逗號前 → 冒號贏', () => {
    // "word: a, b" — ':' 在 index4,',' 在 index7 → 以冒號切,逗號之後整段保留
    const w = only('word: a, b');
    eq(w.word, 'word', 'word'); eq(w.meaning_zh, 'a, b', 'meaning_zh');
  });
  await test('A6b 最先出現者切:逗號在冒號前 → 逗號贏', () => {
    const w = only('alpha, x: y');
    eq(w.word, 'alpha', 'word'); eq(w.meaning_zh, 'x: y', 'meaning_zh');
  });
  await test('A7 兩側 trim', () => {
    const w = only('  hello  ,  world  ');
    eq(w.word, 'hello', 'word'); eq(w.meaning_zh, 'world', 'meaning_zh');
  });
  await test('A8/A9 空行與行首分隔符(空 word)全略過', () => {
    // 空行、純空白、行首是分隔符(before 為空)→ 皆略過 → 長度 0
    const out = parseVocabText('\n   \n\t\t\n,orphan\n:lead');
    eq(out.length, 0, 'length');
  });
  await test('A10 大小寫不敏感去重,保留首次', () => {
    const out = parseVocabText('Apple,\u860b\u679c\napple,SHOULD_BE_DROPPED');
    eq(out.length, 1, 'length');
    eq(out[0].word, 'Apple', '保留首次的原字'); eq(out[0].meaning_zh, '\u860b\u679c', 'meaning_zh');
  });
  await test('A11 正規化欄位對齊 vocab.json schema(含 frequency_tier=2)', () => {
    const w = only('strategy,\u7b56\u7565');
    eq(w.word, 'strategy', 'word');
    eq(w.meaning_zh, '\u7b56\u7565', 'meaning_zh');
    eq(w.pos, '', 'pos');
    eq(w.phonetic, '', 'phonetic');
    eq(w.meaning_en, '', 'meaning_en');
    eq(w.example, '', 'example');
    assert(Array.isArray(w.synonyms) && w.synonyms.length === 0, 'synonyms 應為空陣列');
    assert(Array.isArray(w.exams) && w.exams.length === 0, 'exams 應為空陣列');
    eq(w.category, 'custom', 'category');
    eq(w.source, 'custom', 'source');
    eq(w.difficulty, 2, 'difficulty');
    eq(w.frequency_tier, 2, 'frequency_tier(關鍵:過 selectDistractors 的 <=2 門檻)');
  });

  // ── B. selectDistractors 的 fallbackBank ────────────────────────────────────
  group('B. selectDistractors — fallbackBank 向後相容 / 小表補滿 / 大表不外洩');

  // 內建庫:含 >=4 個同 POS('v.')、tier<=2、TOEIC 的字,供 B1 與 B2 fallback 用
  const builtinBank = [
    W('deliver',    { pos: 'v.', exams: ['TOEIC'], frequency_tier: 1 }), // B1 的答案字
    W('submit',     { pos: 'v.', exams: ['TOEIC'], frequency_tier: 1 }),
    W('approve',    { pos: 'v.', exams: ['TOEIC'], frequency_tier: 2 }),
    W('review',     { pos: 'v.', exams: ['TOEIC'], frequency_tier: 1 }),
    W('negotiate',  { pos: 'v.', exams: ['TOEIC'], frequency_tier: 2 }),
    W('invoice',    { pos: 'n.', exams: ['TOEIC'], frequency_tier: 1 }),
    W('contract',   { pos: 'n.', exams: ['TOEIC'], frequency_tier: 2 }),
    W('hypothesis', { pos: 'n.', exams: ['TOEFL'], frequency_tier: 1 }),
  ];
  const builtinSet = lower(builtinBank);

  await test('B1 向後相容:不傳第5參 → 回 3 個相異、排除答案、皆來自 bank', () => {
    const aw = builtinBank[0]; // deliver
    for (let i = 0; i < 50; i++) {
      const d = selectDistractors(aw, builtinBank, 'TOEIC', 3);
      eq(d.length, 3, `第${i}次:應回 3 個`);
      const keys = d.map((w) => w.word.toLowerCase());
      assert(new Set(keys).size === 3, `第${i}次:選項應相異`);
      assert(!keys.includes(aw.word.toLowerCase()), `第${i}次:不應含答案字`);
      assert(keys.every((k) => builtinSet.has(k)), `第${i}次:應全來自 bank`);
    }
  });

  await test('B2 小自訂表(<4)→ 用 fallbackBank(內建庫)補滿到 3,含至少 1 個來自內建', () => {
    const awC = W('serendipity');            // 自訂答案字,pos='' exams=[]
    const customSmall = [awC, W('ephemeral')]; // 同 pos='' 的字只有 1 個 → pool<3
    for (let i = 0; i < 50; i++) {
      const d = selectDistractors(awC, customSmall, null, 3, builtinBank);
      eq(d.length, 3, `第${i}次:應補滿到 3`);
      const keys = d.map((w) => w.word.toLowerCase());
      assert(!keys.includes('serendipity'), `第${i}次:不應含答案字`);
      const fromBuiltin = keys.filter((k) => builtinSet.has(k)).length;
      assert(fromBuiltin >= 1, `第${i}次:小表湊不滿,應至少 1 個來自 fallbackBank(實際 ${fromBuiltin})`);
    }
  });

  await test('B3 大自訂表(>=4 同 POS)→ 干擾詞全在表內,零外洩(200 次)', () => {
    const awC = W('mellifluous');
    const customLarge = [awC,
      W('petrichor'), W('sonder'), W('limerence'), W('saudade'), W('hiraeth')]; // 5 個同 pos=''
    const customSet = lower(customLarge);
    for (let i = 0; i < 200; i++) {
      const d = selectDistractors(awC, customLarge, null, 3, builtinBank);
      eq(d.length, 3, `第${i}次:應回 3 個`);
      const keys = d.map((w) => w.word.toLowerCase());
      assert(!keys.includes('mellifluous'), `第${i}次:不應含答案字`);
      assert(keys.every((k) => customSet.has(k)), `第${i}次:應全在自訂表內`);
      assert(keys.every((k) => !builtinSet.has(k)), `第${i}次:不應外洩到內建庫`);
    }
  });

  await test('B4 exam 過濾對純英文自訂表的危害(說明 activeExam=null 為何必要)', () => {
    // 這不是測 Main 的碼,而是重現 Main 建 examBank 的那行:activeBank.filter(exams.includes)
    // 自訂表 exams 皆 [] → 一旦套 exam 過濾就被清空 → 出題全壞;故 scope=custom 必須 activeExam=null。
    const customLarge = [W('mellifluous'), W('petrichor'), W('sonder'),
                         W('limerence'), W('saudade'), W('hiraeth')];
    const filtered = customLarge.filter((w) => w.exams && w.exams.includes('TOEIC'));
    eq(filtered.length, 0, '若套 exam 過濾,自訂表會被清空');
    eq([...customLarge].length, 6, '不套過濾(activeExam=null)則保留全部');
  });

  // ── C. storage:customVocabLists / vocabScope(真跑,靠 polyfill)──────────────
  group('C. storage — customVocabLists / vocabScope 六個函式(真實 storage.js)');
  store.clear(); // 隔離:C 組從乾淨 store 開始

  await test('C1 getVocabScope 預設為 builtin/null', async () => {
    const s = await storage.getVocabScope();
    eq(s.source, 'builtin', 'source'); eq(s.customListId, null, 'customListId');
  });

  let listId; // 供後續步驟使用
  await test('C2 createCustomVocabList 建表:id/名稱/空 words,並進入清單', async () => {
    const list = await storage.createCustomVocabList('Textbook A');
    assert(/^custom_\d+$/.test(list.id), `id 應形如 custom_<ts>,實際 ${list.id}`);
    eq(list.name, 'Textbook A', 'name');
    assert(Array.isArray(list.words) && list.words.length === 0, 'words 應為空陣列');
    assert(typeof list.createdAt === 'number', 'createdAt 應為 timestamp');
    listId = list.id;
    const all = await storage.getCustomVocabLists();
    eq(all.length, 1, '清單長度');
    eq(all[0].id, listId, '清單內容');
  });

  await test('C3 名稱留空 → 自動命名(My List N)', async () => {
    const list = await storage.createCustomVocabList('');
    assert(/^My List \d+$/.test(list.name), `空名應自動命名為 My List N,實際 ${list.name}`);
    // 註:若你的自動命名規則與 spec 不同(這裡只驗「有觸發且形狀合理」),非功能性錯誤。
  });

  await test('C4a importWordsToList 併入 2 字', async () => {
    const words = parseVocabText('apple,\u860b\u679c\nbanana,\u9999\u8549');
    const list = await storage.importWordsToList(listId, words);
    eq(list.words.length, 2, '匯入後 words 長度');
    const keys = lower(list.words);
    assert(keys.has('apple') && keys.has('banana'), '應含 apple 與 banana');
  });

  await test('C4b 跨呼叫去重:再匯入 [重複 Apple, cherry] → 只增 cherry', async () => {
    const words = parseVocabText('Apple,dup\ncherry,\u6afb\u6843');
    const list = await storage.importWordsToList(listId, words);
    eq(list.words.length, 3, 'Apple 應被 importWordsToList 依 toLowerCase 去重,只增 cherry');
    const keys = lower(list.words);
    assert(keys.has('apple') && keys.has('banana') && keys.has('cherry'), '應含 apple/banana/cherry');
  });

  await test('C5 importWordsToList 對不存在 id 應 throw', async () => {
    let threw = false;
    try { await storage.importWordsToList('nope_missing', [W('x')]); }
    catch (e) { threw = true; assert(/not found/i.test(e.message), `錯誤訊息應含 "not found",實際:${e.message}`); }
    assert(threw, '應丟出例外');
  });

  await test('C6 setVocabScope → getVocabScope round-trip', async () => {
    await storage.setVocabScope({ source: 'custom', customListId: listId });
    const s = await storage.getVocabScope();
    eq(s.source, 'custom', 'source'); eq(s.customListId, listId, 'customListId');
  });

  await test('C7 deleteCustomVocabList 移除該表', async () => {
    await storage.deleteCustomVocabList(listId);
    const all = await storage.getCustomVocabLists();
    assert(!all.some((l) => l.id === listId), '刪除後清單不應再含該 id');
  });

  // ── 總結 ────────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(56)}`);
  console.log(`通過 ${passed} / 失敗 ${failed}`);
  if (failed > 0) {
    console.log('\n失敗項目:');
    for (const f of failures) console.log(`  \u2717 ${f.name}\n      ${f.message}`);
    console.log('\n提示:C 組若失敗,先核對 storage.js 實際的函式簽名/回傳是否與斷言一致' +
                '(例如 createCustomVocabList 的回傳、importWordsToList 的去重基準)。');
  }
  console.log('='.repeat(56));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\n腳本本身出錯(非測試失敗):', e);
  console.error('\n若是 "Cannot find module" → 確認在 repo 根目錄執行,且 src/services 下三檔存在。' +
                '\n若是 "window is not defined" → polyfill 應在 import 之前;確認未把 import 改成靜態頂層 import。');
  process.exit(2);
});
