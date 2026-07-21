// scripts/enrich-meanings.mjs
// Regenerate Traditional-Chinese meanings for src/data/ceec-clean.json, in place, resumably.
// RUN LOCALLY BY RAY — needs live LLM credentials via env. Claude Code must NOT run this.
//
// All endpoint/model/key values come from environment variables ONLY.
// This file must contain NO concrete endpoint URL, model name, or API key.
//
// Env:
//   MENTORA_LLM_PROVIDER   openai | anthropic | google
//   MENTORA_LLM_MODEL      model name (provider-specific)
//   MENTORA_LLM_API_KEY    api key
//   MENTORA_LLM_BASE_URL   base url (openai-compatible providers only; ignored by anthropic/google)
//   MENTORA_LLM_DELAY_MS   throttle between requests, default 4000 (safe for Gemini free 15 RPM)
//   MENTORA_LLM_LIMIT      optional: stop after N successful writes this run (for quota-bounded runs)
//
// Usage:
//   MENTORA_LLM_PROVIDER=openai MENTORA_LLM_MODEL=... MENTORA_LLM_API_KEY=... MENTORA_LLM_BASE_URL=... node scripts/enrich-meanings.mjs
//   (resumable: rerun anytime; skips words whose enrichment.meaning_zh === 'llm')

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLEAN = join(__dirname, '../src/data/ceec-clean.json');

const PROVIDER = process.env.MENTORA_LLM_PROVIDER;
const MODEL    = process.env.MENTORA_LLM_MODEL;
const API_KEY  = process.env.MENTORA_LLM_API_KEY;
const BASE_URL = process.env.MENTORA_LLM_BASE_URL;
const DELAY_MS = Number(process.env.MENTORA_LLM_DELAY_MS ?? 4000);
const LIMIT    = process.env.MENTORA_LLM_LIMIT ? Number(process.env.MENTORA_LLM_LIMIT) : Infinity;

if (!PROVIDER || !MODEL || !API_KEY) {
  console.error('Missing env. Need MENTORA_LLM_PROVIDER, MENTORA_LLM_MODEL, MENTORA_LLM_API_KEY.');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Prompt (Traditional Chinese, POS-aware, concise, no example sentence) ----
function buildPrompt(word, posArr) {
  const pos = (posArr && posArr.length) ? posArr.join('/') : '';
  return [
    `你是繁體中文英語詞典編輯。為以下英文單字寫出簡潔的繁體中文釋義。`,
    `單字：${word}`,
    pos ? `詞性：${pos}` : ``,
    `要求：`,
    `1. 只用繁體中文（台灣用語），不得出現簡體字。`,
    `2. 全部寫在同一行，絕對不要換行或分行。`,
    `3. 若有多個詞性，各詞性用該詞性標示開頭並以全形直線「｜」分隔，例如「[動] 讚揚；歡呼｜[名] 讚揚；稱讚」。`,
    `4. 每個詞性給 1-3 個最常用義項，用分號分隔，簡潔精確。`,
    `5. 不要例句、不要英文解釋、不要音標、不要多餘說明。`,
    `6. 只輸出釋義本身，不要任何前綴、引號或換行。`,
  ].filter(Boolean).join('\n');
}

// ---- Provider adapters: all return a plain string meaning ----
async function makeAsk() {
  if (PROVIDER === 'openai') {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });
    return async (word, posArr) => {
      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是專業的繁體中文英語詞典編輯。' },
          { role: 'user',   content: buildPrompt(word, posArr) },
        ],
        temperature: 0.3,
      });
      return res.choices?.[0]?.message?.content ?? '';
    };
  }
  if (PROVIDER === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: API_KEY });
    return async (word, posArr) => {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: '你是專業的繁體中文英語詞典編輯。',
        messages: [{ role: 'user', content: buildPrompt(word, posArr) }],
      });
      const block = res.content?.find(b => b.type === 'text');
      return block?.text ?? '';
    };
  }
  if (PROVIDER === 'google') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });
    return async (word, posArr) => {
      const res = await model.generateContent(buildPrompt(word, posArr));
      return res.response.text() ?? '';
    };
  }
  throw new Error(`Unknown MENTORA_LLM_PROVIDER: ${PROVIDER}`);
}

// ---- Lightweight inline sanity (full validation is in test-b3-meaning-format.mjs) ----
function looksBad(s) {
  if (!s || !s.trim()) return 'empty';
  const t = s.trim();
  if (t.length < 1) return 'too-short';                 // was <2; single-char meanings (貓/梨) are valid
  if (t.length > 120) return 'too-long';                // was >60; polysemous function words need room
  if (/[\r\n]/.test(t)) return 'has-newline';
  if (!/[一-鿿]/.test(t)) return 'no-cjk';
  // Refusal detection: match only UNAMBIGUOUS refusal phrases, not normal gloss words.
  // '無法'/'抱歉' removed as standalone triggers because words like sorry/regret/paralyze
  // legitimately contain them ('抱歉的', '使無法動彈').
  if (/(as an ai|i cannot|i'm unable|i am unable|language model|我無法回答|我不能提供|無法協助)/i.test(t)) return 'refusal';
  return null;
}

async function main() {
  const doc = JSON.parse(readFileSync(CLEAN, 'utf8'));
  const words = doc.words || [];
  const ask = await makeAsk();

  const pending = words.filter(w => (w.enrichment?.meaning_zh ?? 'pending') !== 'llm');
  console.log(`provider=${PROVIDER} model=<env> total=${words.length} pending=${pending.length} delay=${DELAY_MS}ms limit=${LIMIT}`);

  let done = 0, failed = 0, i = 0;
  const flushEvery = 25;   // write to disk periodically so a crash keeps progress

  for (const w of words) {
    if ((w.enrichment?.meaning_zh ?? 'pending') === 'llm') continue;
    if (done >= LIMIT) { console.log(`hit LIMIT=${LIMIT}, stopping.`); break; }
    i++;
    try {
      const meaning = (await ask(w.word, w.pos)).trim();
      const bad = looksBad(meaning);
      if (bad) {
        failed++;
        console.warn(`  [${i}] ${w.word}: SKIP (${bad})`);
      } else {
        w.meaning_zh = meaning;
        if (!w.enrichment) w.enrichment = {};
        w.enrichment.meaning_zh = 'llm';
        done++;
        if (done % 20 === 0) console.log(`  [${done}] ${w.word} -> ${meaning.slice(0,30)}`);
      }
    } catch (e) {
      failed++;
      console.error(`  [${i}] ${w.word}: ERROR ${e.message || e}`);
      // On rate-limit-ish errors, back off harder
      if (/429|rate|quota|exhausted/i.test(String(e.message || e))) {
        console.error('   rate/quota hit — sleeping 60s'); await sleep(60000);
      }
    }
    if (done > 0 && done % flushEvery === 0) {
      writeFileSync(CLEAN, JSON.stringify(doc, null, 2), 'utf8');
      console.log(`   …flushed (${done} written)`);
    }
    await sleep(DELAY_MS);
  }

  writeFileSync(CLEAN, JSON.stringify(doc, null, 2), 'utf8');
  const remaining = words.filter(w => (w.enrichment?.meaning_zh ?? 'pending') !== 'llm').length;
  console.log(`\nDONE this run: wrote=${done} failed/skipped=${failed} remaining=${remaining}/${words.length}`);
  if (remaining > 0) console.log('Rerun to continue (skips completed words).');
}

main();
