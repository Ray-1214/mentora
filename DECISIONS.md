# DECISIONS — 決策紀錄 (ADR-lite)

> 記「決定了什麼 + 為什麼」，避免重複討論，也讓新對話快速掌握脈絡。
> 有新決策就往下加一列;若推翻舊決策，把舊的狀態改為「已取代」並註明被哪一條取代。

| # | 日期 | 決定 | 理由 | 狀態 |
|---|---|---|---|---|
| 1 | 2026-06-23 | 平台架構:一份 React 核心，桌面用 Electron、手機日後用 Capacitor 包同一份 `src/` | 最大化程式碼重用;Electron 不能上 Play，但要上架的是 React 核心經 Capacitor，非 Electron | 生效 |
| 2 | 2026-06-23 | 不重寫成 Flutter / React Native | 會摧毀 layer-1(UI + 邏輯)重用 | 生效 |
| 3 | 2026-06-23 | 競賽先做桌面、不上架 | 短期目標是 InnoServe，本機能 demo 即可 | 生效 |
| 4 | 2026-06-23 | 出題引擎:決定性排序 → 加權隨機(1a)→ SRS(1b) | 解決「由上往下 + 單調」，且保留教學優先序 | 1a 完成 |
| 5 | 2026-06-23 | 競賽組別:教育 AI 組(暫定) | 命題吻合「以 AI 解決學生學習」 | 暫定 |
| 6 | 2026-06-23 | 實作工具:Claude Code(VS Code 擴充、Local 來源、Claude Pro 帳號) | 本機開發要能跑 Electron / build;Local 比雲端沙箱順;Pro 可用 Sonnet | 生效 |
| 7 | 2026-06-23 | 專案名 `mentora`(中文展示加「-英語AI家教」) | 撞名在競賽階段無妨;上架前再查商標 | 暫定 |
| 8 | 2026-06-23 | 協作:一個任務一個新對話，靠 `.md`(CLAUDE / ROADMAP / DECISIONS)做 handoff | 避免對話過長被壓縮;讓新對話可無縫接手 | 生效 |
| 9 | 2026-06-23 | 不採用 ruflo(多代理 swarm 框架) | 規模不合(單線、一次一檔)、背景 daemon 有燒光額度風險、複雜度排擠交件 | 生效 |
| 10 | 2026-06-23 | Project 連 GitHub:只連 `CLAUDE.md` / `ROADMAP.md` / `DECISIONS.md`，不連 `src/` | 新對話需要這些 docs 接手;`src/` 太大(116%)且會過期，程式碼交給 Claude Code | 生效 |
