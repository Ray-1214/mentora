# CLAUDE.md — English Tutor (formerly "TOEIC Drill")

> Read at the start of every Claude Code session. Keep this file current.
> Source-of-truth docs: this file (stack / architecture / rules), ROADMAP.md
> (build order + backlog), DECISIONS.md (decisions + rationale — create as needed).

## 1. What this is
Desktop app for AI-assisted English exam practice (TOEIC / TOEFL / IELTS / GSAT),
evolving into a broader **personalized** English tutor. Current internal version: v2.1.0.
Short-term goal: a polished desktop entry for the InnoServe 2026 competition (Education-AI track).

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
- **NEVER hardcode API keys.** Remove the existing hardcoded fallback key in
  `public/electron.js`. The key comes from Settings / `.env` only. Once the backend exists,
  the client holds no provider key at all.
- Keep ALL business logic (word selection, SRS, stats, LLM prompts, JSON parsing) in
  `src/services/` — UI-framework-agnostic, so it survives the future mobile port untouched.
- No direct `electron`/Node calls inside React components — go through a layer-2 service.
- Comment any non-obvious logic. Match existing code style.

## 5. Known issues to keep in mind
- **Word selection is fully deterministic.** `src/services/vocab.js → selectAnswerWords`
  sorts by fixed criteria with zero randomness, so same-condition words always emerge in
  database order ("top-down" bug) and feel monotonous. Scheduled for replacement by
  weighted-random sampling, then a proper SRS scheduler (see ROADMAP.md Stage 1).

## 6. How we work (this project's workflow)
- Architecture/scope decisions are made in a separate **planning chat**, then recorded here
  and in ROADMAP.md. Implementation prompts for Claude Code originate from that chat.
- **Implement strictly in the order ROADMAP.md specifies.** After finishing a task: keep the
  layer separation above, then update that task's status in ROADMAP.md.
- The human (Ray) is sole implementer-by-proxy: he relays prompts and runs/tests builds
  locally. Provide runnable verification steps where practical.
