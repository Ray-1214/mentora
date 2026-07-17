# DECISIONS — 決策紀錄 (ADR-lite)

> 記「決定了什麼 + 為什麼」，避免重複討論，也讓新對話快速掌握脈絡。
> 有新決策就往下加一列;若推翻舊決策，把舊的狀態改為「已取代」並註明被哪一條取代。

| # | 日期 | 決定 | 理由 | 狀態 |
|---|---|---|---|---|
| 1 | 2026-06-23 | 平台架構:一份 React 核心，桌面用 Electron、手機日後用 Capacitor 包同一份 `src/` | 最大化程式碼重用;Electron 不能上 Play，但要上架的是 React 核心經 Capacitor，非 Electron | 生效 |
| 2 | 2026-06-23 | 不重寫成 Flutter / React Native | 會摧毀 layer-1(UI + 邏輯)重用 | 生效 |
| 3 | 2026-06-23 | 競賽先做桌面、不上架 | 短期目標是 InnoServe，本機能 demo 即可 | 生效 |
| 4 | 2026-06-23 | 出題引擎:決定性排序 → 加權隨機(1a)→ SRS(1b) | 解決「由上往下 + 單調」，且保留教學優先序 | 1b 完成 |
| 5 | 2026-06-23 | 競賽組別:教育 AI 組(暫定) | 命題吻合「以 AI 解決學生學習」 | 已取代(見 #26) |
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
| 20 | 2026-07-08 | Part 5 priorityWords 組裝抽出成 `vocab.js → selectPriorityWords`(不收 `exam`,`examBank` 已 scope-resolved);Main quiz 分支改呼叫之 | 原 quiz 分支傳原始 `exam`,在 custom scope 下二次 exam 過濾把 `exams:[]` 的匯入字清空,priorityWords 退化為僅 `weakWords.slice(0,5)`;抽成純函式同時滿足 CLAUDE.md §4 並讓 payload 可 red/green 測試 | 生效 |
| 21 | 2026-07-08 | 內部版本統一 v2.3.0,`package.json` version 由 1.1.0 對齊至 2.3.0 | 跨 Stage 2 + Stage 3 兩次向後相容 MINOR(2.1→2.3);npm 版與 docs 內部版長期分歧,單產品雙版號易誤用,且 version 會標記 release artifact,應反映真實里程碑 | 生效 |
| 22 | 2026-07-08 | 全 repo 改名 TOEIC Drill / Test Drill / QuizApp / English Tutor → Mentora(含 appId、productName、NSIS、`<title>`、Anki deck/tag/檔名、release 腳本 exe/zip 名);裸考試型別與 .md 歷史提及保留 | 品牌統一;`productName`/`name` 變動使 Electron userData 目錄改變、既有 electron-store 資料一次性重置(dev 資料,可接受;store name 改為 `mentora-data`),改名後首次啟動須重填 API 設定 | 生效 |
| 23 | 2026-07-08 | 刪除 QuizApp/CRA 範本殘骸死碼共 15 檔:semantic-ui-react 叢集 13 檔(7 源 Header/Layout/Countdown/Offline/ShareButton/Result{QNA,Stats} + 6 story)+ 完整 PWA service-worker scaffold 2 檔(`src/serviceWorkerRegistration.js` 唯一 `sweetalert2` import;`src/service-worker.js` workbox worker;`register()` 從未被 `src/index.js` 呼叫 → registration 與 worker 皆死);連帶消滅 `semantic-ui-react` 與 `sweetalert2` 兩個幽靈依賴,src 內兩者 import 全數清除 | 全在 CRA build graph 之外(build 過但兩套件未安裝、不在 lock)、無活檔引用、無 test 引用;依既有原則「不宣告幽靈依賴壓 CI 警告,改刪死碼」;刪 `service-worker.js` 後 workbox InjectManifest 跳過(swSrc 不存在)、build 的 precache 警告消失;guard `test-w8-deadcode-clean.mjs` 綠;順帶修好本就壞掉的 npm run storybook | 生效 |
| 24 | 2026-07-08 | 匿名化(盲審):移除機構(校名 / 網域)與個人識別碼於 UI / 程式碼 / docs;Settings 表單 apiBase 預設改空字串 + 中性 placeholder、model 預設與提示改中性;程式碼 base-URL fallback 與 `.env.example` 範例改中性 OpenAI 相容值(api.openai.com/v1、gpt-4o-mini);`public/electron.js` 硬編碼 fallback key 移除(改 `''`);CI build 移除 API key 注入 | 競賽盲審匿名要求 + CLAUDE.md §4(client 不持有 provider key);該 key 曾入公開 git 歷史 → 視為已洩漏,須於供應商端 rotate | 生效 |
| 25 | 2026-07-14 | UI 方向:啟動器(首頁)與工作區(答題頁)分離。北極星 = IDE 式常駐工作區(僅答題頁):center=作答、right dock=AI 助手(預留)、bottom dock=單字/文法解釋(預留)、left rail=區域導航(練習/錯題本/單字表/單字庫)。future-feature dock 預設收合。首頁 = 啟動器(Option A:主決策 Mode + 情境 Exam 常駐,其餘設定收合為可見摘要 + 按需展開 + 合理預設)。競賽投交前只實作首頁 Option A;docks 隨其功能(AI chat / 解釋)落地時再建,不預先建空殼。理由:①一次看太多=選擇過載,與冷靜定位衝突→密度改以「預設收合+視覺分層」承載;②IDE 學習曲線需高頻使用攤平、備考學生低頻→預設收合保護新手、展開保留 power-user;③空 dock 對 3–5 分鐘 demo 零加分且有破壞 core loop 風險→demo 經濟學上 defer;④「預留 Ask-AI 位置」於架構層(=工作區 right dock)即滿足。 | 生效 |
| 26 | 2026-07-16 | 競賽改為 NIICC 2026(全國大專校院智慧創新暨跨域整合創作競賽,國立中央大學主辦),組別 = 數位運算科技與創新應用組;取代 #5 的 InnoServe 教育 AI 組 | 該組涵蓋智慧學習 / 人工智慧 / 大型語言模型 / 生成式 AI / AI 代理,與本案完全吻合;初賽為文件審查(企劃書 + 系統需求書 + 3 分鐘影片),8/7 截止,決賽 11/1 於中央大學實地攤位展示 | 生效 |
| 27 | 2026-07-17 | 競賽文件撰寫管線:內容以 Markdown 寫在 repo(Claude Code 可編、git 可追);【不採 LaTeX】;「Markdown → 交件 PDF」的渲染管線待 7/24 訓練營後再定(候選:手動灌官方 .docx / pandoc --reference-doc=官方.docx / 腳本改 docx XML) | ①官方 Q&A 明示「有規定格式,逕由競賽網站下載」→ 規定格式 = 下載的 .docx,LaTeX 自製版型等於交出非規定格式;②LaTeX 相對 Markdown 的唯一增益是省掉手動灌,而該增益有更便宜且不需現在決定的拿法(pandoc 已實測可讀官方 .docx 為 grid table);③LaTeX 把內容與版型綁死,但版型 7/24 才定案 → 等於在規格未知時先做會重做的工;④CJK LaTeX(標楷體/XeLaTeX)是新工具鏈,三週倒數不該放上關鍵路徑;⑤簡章 捌:初賽文件本身僅佔 20%,排版工時是從另外 80% 挪用;⑥Markdown 不關掉任何後路,LaTeX 會關掉 .docx 那條 | 生效 |
| 28 | 2026-07-17 | 系統需求書之系統簡稱 = MTR;編號 MTR-NF-001 / MTR-F-001 / MTR-UC001(UC 少一個連字號係照官方 .docx 原文,非筆誤,不得「修正」) | 取自 Mentora 子音骨架,3 碼省欄寬(編號跨初賽/決賽文件重複出現),可一眼對回作品名;不用全名(欄位要求「簡稱」且欄寬吃緊);不用 MEN/MNT/MTA(語意干擾或撞名 maintenance / 紐約 MTA) | 生效 |
