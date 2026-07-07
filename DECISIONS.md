# DECISIONS — 決策紀錄 (ADR-lite)

> 記「決定了什麼 + 為什麼」，避免重複討論，也讓新對話快速掌握脈絡。
> 有新決策就往下加一列;若推翻舊決策，把舊的狀態改為「已取代」並註明被哪一條取代。

| # | 日期 | 決定 | 理由 | 狀態 |
|---|---|---|---|---|
| 1 | 2026-06-23 | 平台架構:一份 React 核心，桌面用 Electron、手機日後用 Capacitor 包同一份 `src/` | 最大化程式碼重用;Electron 不能上 Play，但要上架的是 React 核心經 Capacitor，非 Electron | 生效 |
| 2 | 2026-06-23 | 不重寫成 Flutter / React Native | 會摧毀 layer-1(UI + 邏輯)重用 | 生效 |
| 3 | 2026-06-23 | 競賽先做桌面、不上架 | 短期目標是 InnoServe，本機能 demo 即可 | 生效 |
| 4 | 2026-06-23 | 出題引擎:決定性排序 → 加權隨機(1a)→ SRS(1b) | 解決「由上往下 + 單調」，且保留教學優先序 | 1b 完成 |
| 5 | 2026-06-23 | 競賽組別:教育 AI 組(暫定) | 命題吻合「以 AI 解決學生學習」 | 暫定 |
| 6 | 2026-06-23 | 實作工具:Claude Code(VS Code 擴充、Local 來源、Claude Pro 帳號) | 本機開發要能跑 Electron / build;Local 比雲端沙箱順;Pro 可用 Sonnet | 生效 |
| 7 | 2026-06-23 | 專案名 `mentora`(中文展示加「-英語AI家教」) | 撞名在競賽階段無妨;上架前再查商標 | 暫定 |
| 8 | 2026-06-23 | 協作:一個任務一個新對話，靠 `.md`(CLAUDE / ROADMAP / DECISIONS)做 handoff | 避免對話過長被壓縮;讓新對話可無縫接手 | 生效 |
| 9 | 2026-06-23 | 不採用 ruflo(多代理 swarm 框架) | 規模不合(單線、一次一檔)、背景 daemon 有燒光額度風險、複雜度排擠交件 | 生效 |
| 10 | 2026-06-23 | Project 連 GitHub:只連 `CLAUDE.md` / `ROADMAP.md` / `DECISIONS.md`，不連 `src/` | 新對話需要這些 docs 接手;`src/` 太大(116%)且會過期，程式碼交給 Claude Code | 生效 |
| 11 | 2026-06-29 | SRS 採 Leitner(階梯 [0,1,2,4,7,14,30] 天、答錯歸第 0 格) | 輸入為二元對/錯,SM-2/FSRS 需分級回憶品質、不契合;Leitner 狀態最小、可測、可解釋。SM-2/FSRS 列日後升級(srs.js 已隔離,屆時只換該檔) | 生效 |
| 12 | 2026-06-29 | src/ 內跨檔相對 import 一律帶 .js 副檔名 | node 驗收腳本走原生 ESM,無副檔名解析不到;webpack build 不受影響 | 生效 |
| 13 | 2026-07-06 | 自訂單字匯入格式=純貼上 + 寬鬆行導向 parser(一行一字、分隔符取最先出現的 , / Tab / ， / :);無檔案選擇器、無表頭偵測 | 純貼上最快可 demo、跨平台無檔案 API 依賴(利手機移植);寬鬆 parser 容忍使用者從課本 / 補習班隨手複製 | 生效 |
| 14 | 2026-07-06 | 資料模型:自訂字表用 `customVocabLists`(具名表陣列)+ `vocabScope`(目前範圍)雙 key,與 `extendedVocab` 分離 | `extendedVocab` 是「LLM 擴充內建庫」、自訂表是「使用者具名範圍」,語意不同;分 key 避免互相汙染、各自去重 | 生效 |
| 15 | 2026-07-06 | scope 採 Scope-Narrow(只作用 vocab / defmatch / reversedrill 三個 drill 模式)+ 接線走 Path 1(接進既有 `sortVocab`,不把 drills 遷移到 `selectAnswerWords`) | 最小變更、風險低、當天可 demo;Part 5/6/7 主題導向不受自訂範圍影響。已知待辦:1a/1b 的加權隨機 + SRS 尚未接進 drills(仍走 sortVocab),列後續任務 | 生效(Scope-Narrow 仍成立;接線機制由 #16 取代:drills 改走 selectAnswerWords、sortVocab 已刪) |
| 16 | 2026-07-07 | 三個 drill 模式改由 `vocab.js` 的 `selectAnswerWords` 選答案字(加權隨機 + Leitner SRS + 弱點 bonus),私有 `sortVocab` 刪除 | 1a/1b + 弱點路由必須真正作用到 drills;選字邏輯收斂為 services 內單一路徑(CLAUDE.md §4)。取代 #15 的 drill-side `sortVocab` 接線 | 生效 |
| 17 | 2026-07-07 | 弱點單字訊號由僅 `'Vocabulary'` 擴為三個 drill quizType(Vocabulary / Definition Match / Reverse Drill),視窗 -60 → -120 | DefinitionMatch / ReverseDrill 的錯題原本有記錄卻未被路由;三模式共用同一弱點訊號(順帶豐富 Part 5 priorityWords) | 生效 |
| 18 | 2026-07-07 | 弱點加權 `WEAK_BONUS = 4`(在 `answerWeight` 內乘法生效) | 需克服 `times_as_answer` 對已練字的壓抑;實測 uplift ~3.5x、control ~1x(test-stage3-weakness-routing.mjs) | 生效 |
| 19 | 2026-07-07 | Part 5 prompt 組裝抽到純函式 `buildPart5Prompt`(`part5Prompt.js`,無 SDK) | 讓弱點 payload 可在無 LLM 下被測(Track B);LLM 產出的遵從度仍無法單元測試 | 生效 |
