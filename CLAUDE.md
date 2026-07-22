# CLAUDE.md — Mentora (formerly "TOEIC Drill")

> Read at the start of every Claude Code session. Keep this file current.
> Source-of-truth docs: this file (stack / architecture / rules), ROADMAP.md
> (build order + backlog), DECISIONS.md (decisions + rationale — create as needed).

## 1. What this is
Desktop app for AI-assisted English exam practice (GSAT 學測; TOEIC / TOEFL / IELTS
exam-format simulation is on the Backlog, not in the competition build),
evolving into a broader **personalized** English tutor. Current internal version: v2.4.0.
Short-term goal: a polished desktop entry for the NIICC 2026 competition (全國大專校院智慧創新暨跨域整合創作競賽, hosted by National Central University), track 數位運算科技與創新應用組. Preliminary document review deadline: 2026-08-07.

## 2. Stack — do NOT swap any of these without updating this file
- Electron 31 — desktop shell
- React 18 (CRA) — UI **and** all client-side logic
- electron-store — local JSON storage
- openai SDK 4.47 — LLM calls (OpenAI-compatible endpoint)
- electron-builder 24 — packaging (NSIS installer + portable)
- GitHub Actions (windows-latest) — release builds

## 3. Architecture — one core, swappable shells
Three layers, kept separate on purpose:

1. **UI + client logic** (React/JS in `src/`) — platform-independent, shared across all targets.
2. **Platform services behind an abstraction.** `src/services/storage.js` already does this
   (electron-store vs localStorage). EVERY platform-specific API — file save, audio, storage,
   etc. — MUST sit behind such an interface. Never call Electron/Node APIs directly from a
   React component.
3. **Backend API** — does not exist yet. Will own: LLM proxy, token accounting,
   ad-reward verification, user accounts. Added before any public release, not before.

**Platform plan:** desktop = Electron (now). Mobile (Android/iOS) = Capacitor wrapping the
SAME `src/` (later, post-competition). **DO NOT rewrite the UI in Flutter / React Native** —
that destroys layer-1 reuse. Adding mobile = adding a shell + filling in layer-2
implementations, NOT a rewrite.

## 4. Hard rules
- **NEVER hardcode API keys.** The hardcoded fallback key in `public/electron.js` has been
  removed (fallback is now `''`); the key comes from Settings / `.env` only. Once the backend
  exists, the client holds no provider key at all.
- Keep ALL business logic (word selection, SRS, stats, LLM prompts, JSON parsing) in
  `src/services/` — UI-framework-agnostic, so it survives the future mobile port untouched.
- No direct `electron`/Node calls inside React components — go through a layer-2 service.
- Comment any non-obvious logic. Match existing code style.
- Cross-file relative imports inside `src/` always carry the `.js` extension (the Node
  verification scripts run as native ESM and won't resolve extensionless paths; webpack is
  unaffected).

## 5. Known issues to keep in mind
- **Word selection: weighted-random (1a) + Leitner SRS due-priority (1b), done.**
  `src/services/vocab.js → selectAnswerWords` now uses weighted-random sampling (A-Res) and
  draws due words first via the Leitner scheduler in `src/services/srs.js`. It accepts an
  injectable `now` for testing.
- **Part 5 custom-scope routing gap — fixed (W8).** The quiz branch's Part 5 priorityWords
  assembly was extracted to `src/services/vocab.js → selectPriorityWords`, which takes NO `exam`
  argument (the passed `bank`/`examBank` is authoritative and already scope/exam-resolved). Main
  now calls it with the scope-resolved `examBank`, so under a custom scope imported words
  (`exams: []`) are no longer re-filtered away and priorityWords keeps its topic selection.
  Covered by test-w8-part5-priority-scope.mjs.

## 詞彙資料(2026-07-20 起)
- 單一來源:大考中心《高中英文參考詞彙表》官方 PDF 重抽 → src/data/ceec-clean.json(6169 詞,權威源)。
- app 讀 src/data/vocab.json,由 scripts/build-vocab.mjs 從 ceec-clean.json 派生(勿手改 vocab.json,改源頭後重跑 build)。
- 繁中釋義由 scripts/enrich-meanings.mjs(多供應商 LLM,可續跑)生成;端點/模型/金鑰全走 env(MENTORA_LLM_*),不進版控。
- 舊管線 parse-ceec.js/fetch-vocab.js/rebuild-vocab.js 已 DEPRECATED(見 src/data/README.md、DECISIONS #34)。
- 授權:CEEC 詞表非 public domain,僅授權非營利使用;商業化前須書面授權(DECISIONS #35)。
- 單一 CEEC(學測)字庫,六模式不做 exam 過濾(exam 選擇器已移除,DECISIONS #36);LLM 考試脈絡與題目 tag 走模組常數 `BANK_EXAM='學測'`。抽題可用性(能否進 Definition Match / Reverse Drill)判斷走 `vocab.js → hasUsableMeaning`(非空即可,取代舊 `meaning_zh.length > 3`)。

## 6. How we work (this project's workflow)
- Architecture/scope decisions are made in a separate **planning chat**, then recorded here
  and in ROADMAP.md. Implementation prompts for Claude Code originate from that chat.
- **Implement strictly in the order ROADMAP.md specifies.** After finishing a task: keep the
  layer separation above, then update that task's status in ROADMAP.md.
- The human (Ray) is sole implementer-by-proxy: he relays prompts and runs/tests builds
  locally. Provide runnable verification steps where practical.
