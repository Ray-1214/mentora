# Mentora

An AI-powered English exam practice desktop app (TOEIC / TOEFL / IELTS / GSAT), built with Electron + React, using an OpenAI-compatible LLM endpoint to generate practice questions on demand.

## Features

| Mode | Description |
|------|-------------|
| **Part 5** | Sentence completion — grammar & vocabulary MCQ |
| **Part 6** | Paragraph fill — 3-blank business document |
| **Part 7** | Reading comprehension — short passage + 3 questions |
| **Vocab Drill** | 360-word TOEIC vocabulary bank, tracks accuracy per word |
| **Review Notebook** | Auto-saves every wrong answer; filterable by type |
| **Anki Export** | One-click export to `.txt` for Anki Desktop import |
| **Vocab Bank Manager** | Expand vocabulary to 7,000+ words using LLM generation |

- Score band estimation (460 / 600 / 730 / 860+) after each session  
- Prioritizes least-practiced and most-failed vocabulary words  
- Local persistence via `electron-store` (no account needed)

## Prerequisites

- Node.js 18+
- An API key for an OpenAI-compatible LLM endpoint

## Setup

```bash
git clone https://github.com/<owner>/mentora.git
cd mentora

# Install dependencies (self-signed cert — SSL workaround may be required)
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"   # PowerShell
npm install
```

Copy the environment template and fill in your API key:

```bash
copy .env.example .env
# Edit .env and set REACT_APP_LLM_API_KEY=your-key
```

## Development

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
npm run electron-dev
```

## Build for Release

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
npm run electron-build
```

Output: `dist/` — portable Windows x64 executable.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run electron-dev` | Start Electron in development mode (hot reload) |
| `npm run electron-build` | Build React + package Electron for Windows |
| `npm start` | React dev server only (no Electron) |
| `npm run build` | React production build only |

## Tech Stack

- **Electron 31** — desktop shell
- **React 18** + CRA — UI
- **OpenAI SDK** — LLM API client (OpenAI-compatible endpoint)
- **electron-store** — local data persistence
- **LLM**: OpenAI-compatible endpoint (default model `gpt-oss-120b`)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_LLM_BASE_URL` | LLM API base URL |
| `REACT_APP_LLM_API_KEY` | Your API key |
| `REACT_APP_LLM_MODEL` | Model name (default: `gpt-oss-120b`) |

> **Note**: The `.env` file is gitignored. Never commit your API key.

## License

MIT
