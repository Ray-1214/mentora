# mentora — 開發計畫書 (ROADMAP)

> 本檔是「**做什麼 / 為什麼 / 順序 / 怎麼算完成**」的單一事實來源(living doc，持續更新)。
> 技術棧與架構鐵則見 `CLAUDE.md`;決策與理由見 `DECISIONS.md`。
> 每完成一個任務，回來更新對應階段的「狀態」與「驗收結果」。

## 狀態
| 項目 | 內容 |
|---|---|
| 版本 | v1.0 |
| 最後更新 | 2026-07-20 |
| 負責人 | Ray(架構 / 決策 / 測試);實作由 Claude Code |
| 目前階段 | 競賽初賽文件撰寫(企劃書 / 系統需求書 / demo 影片) |
| 內部版本 | v2.4.0 |
| 關鍵期限 | 初賽文件截止 2026-08-07 23:59 ・ 入圍公告 09-02 ・ 決賽 11-01 |

## 怎麼用這份文件(重要)
- 我們採「**一個任務一個新對話**」(避免 claude.ai 對話過長被壓縮)。每個新對話開始時，確保本檔與 `DECISIONS.md` 是最新版(見 §11)。
- 每個階段的「**驗收標準**」是「完成」的客觀定義。沒過驗收 = 沒完成。
- 精準的 Claude Code 提示詞**不寫在本檔**，而是在該階段的對話裡、看著相關程式碼即時產出。本檔定義 WHAT 與「怎麼驗收」，不是逐行 HOW。

---

## 1. 產品概述
- **是什麼**:AI 輔助英語考試練習桌面 app(學測 GSAT;TOEIC/TOEFL/IELTS 題型模擬列 Backlog 未來發展)，正演進為**個人化英語 AI 家教**。
- **解決什麼**:市面 app 多為固定題庫;本案用 LLM 即時生成題目 + 個人化排程(SRS)+ 弱點路由，讓練習「像真的家教，依你的程度與弱點出題」。
- **給誰**:見 §3。

## 2. 目標與成功指標
**競賽目標**:NIICC 2026 數位運算科技與創新應用組,做出完成度高、差異化清楚的桌面作品。
**成功指標(可量測)**:
- [x] 出題不再決定性(階段 1a:同條件 200 次抽 10 字 → ≥1000 種不同字)。**已達成(1888 種)。**（階段 3 起三個 drill 模式改走 `selectAnswerWords`,加權隨機已接進實際出題。）
- [x] SRS 排程運作:答對的字在 due 之前不重複出現;due 的字優先出。**已達成(test-stage1b-srs-scheduling.mjs 7 組全綠)。**（階段 3 起 drills 走 `selectAnswerWords`,Leitner due 優先已接進實際出題。)
- [x] 弱點路由可量測:錯 N 次的字 / 文法點，在後續測驗的出現率顯著高於基準。**已達成(階段 3:test-stage3-weakness-routing.mjs 加權路由 uplift 3.51x ≥ 2x、control 1.02x;test-stage3-part5-payload.mjs Part 5 payload 100% supplied / 0% empty)。**
- [x] 使用者可自訂字表與範圍並持久化。**已達成(階段 2:customVocabLists + vocabScope;三個 drill 模式接自訂範圍)。**
- [ ] Demo 能在 3–5 分鐘內展示「生成題目 → 答題 → 弱點被記錄 → 下次自動加強」的完整循環。

## 3. 使用者與使用情境
**主要使用者**:準備 TOEIC / TOEFL / IELTS / 學測的學生(自學為主)。
**核心情境**:
1. 選考試 + 模式 + 難度 → LLM 生成題目 → 作答 → 看結果與弱點。
2. 反覆練習，系統依 SRS 安排「該複習的字」，並把錯題自動排進下次。
3. 匯入自己的單字表(課本 / 補習班)，只練指定範圍。

## 4. 競賽脈絡(NIICC 2026・全國大專校院智慧創新暨跨域整合創作競賽)
主辦:國立中央大學。競賽網站:https://niicc.cilab.csie.ncu.edu.tw/
組別:數位運算科技與創新應用組(涵蓋物聯網應用、智慧學習、人工智慧、大型語言模型、生成式 AI、AI 代理)。

| 項目 | 日期 |
|---|---|
| 報名截止 | 2026/7/10 23:59(已完成) |
| 訓練營 | 高雄 7/24 ・ 台中 7/27 ・ 台北 7/29;三場皆同步直播 + 全程錄影,課後置於競賽網頁。主課:**人機互動與軟體工程**。參加為必要項目。Q&A:隊伍可自由選場次;只要一位以上隊員參加即免請假,全隊缺席才需指導教師親筆簽名請假單。 |
| **初賽文件截止** | **2026/8/7 23:59** — 企劃書(PDF)、系統需求書(PDF)、3 分鐘展示影片(mp4 或 H265,≤128MB) |
| 入圍決賽公告 | 2026/9/2 |
| 作品設計測試文件截止 | 2026/10/23 23:59 |
| 決賽實地測試 | 2026/11/1(國立中央大學,攤位展示;需紙本「作品簡介」與「作品設計測試文件」各 4 份) |

**硬規則(直接約束文件與影片)**
- **匿名**:所有書面資料、簡報、展示影片、作品、口頭報告、服裝,不得出現學校系所標誌 / 名稱、教授姓名或任何可識別參賽者身分之資料。違反:初賽 ×0.8;決賽直接零分。→ 與 DECISIONS #24 一致;錄影須避開 Settings(apiBase)、DevTools、含 URL 的錯誤訊息。
- **多競賽衝突**:同一作品已在公開競賽獲獎者不得參賽(發明展、校內競賽除外);同時報名他賽時,若在本競賽決賽前已獲他賽晉級決賽 / 複賽通知,須放棄他賽資格才能參加本競賽決賽。
- 有技術合作單位或接受機構補助者,須於企劃書 / 系統需求書註明。
- **【文件格式】**:官方 Q&A 明示:企劃書與系統需求書「有規定格式」,格式檔逕由競賽網站下載;範本另供參考。→ 下載的 .docx = 規定格式;Meeting Scheduler 範本 PDF = 僅供參考。簡章 玖 另定「依據訓練營所教導之文件撰寫方式」。企劃書 Q&A:「每一項都要填寫」。
- **【生成式 AI 揭露】**:簡章 拾貳:作品使用生成式 AI 者,須揭露標註使用來源及範圍,不影響計分;須註明於**企劃書、系統需求書、作品設計測試文件**三份。Mentora 以 LLM 出題 → 三份皆須揭露 LLM 來源與使用範圍。待釐清(訓練營或 email 主辦問):此條是否亦涵蓋「以 AI 輔助開發」;因揭露不扣分,預設兩者都揭露。

**評審標準**

| 文件審查(初賽) | 佔比 |
|---|---|
| 企劃書 / 系統需求書 / 影片 | 20% |
| 設計創新性 | 25% |
| 理論基礎深度性 | 15% |
| 實用性與完整性 | 25% |
| UI 與 UX 設計 | 15% |

| 實地測試(決賽) | 佔比 |
|---|---|
| 作品設計測試文件 | 20% |
| 簡報表現 | 20% |
| 實體展示 | 60% |

> 初賽 80% 靠三份文件承載,文件本身作為產物僅佔 20%。

## 5. 範圍
**短期(競賽)範圍內**:桌面 Electron app、上述五項成功指標、不上架、在本機可 demo。
**明確範圍外**(避免 scope creep，移至 Backlog §9):手機版、上架、後端 API、看廣告換 token、口說 / 發音評測、換更便宜 LLM。

## 6. 假設・相依・限制
- LLM 端點目前是自架的開發用端點,僅供開發;上架需換商用供應商(Backlog)。
- API key 來自 Settings / .env;**硬編碼 fallback 已移除**(fallback 現為 `''`)。
- 商業邏輯一律留 `src/services/`，平台相關走 layer-2 抽象(見 CLAUDE.md)，以利日後 Capacitor 手機移植不重寫。
- 開發環境 SSL 攔截:開發用 `NODE_TLS_REJECT_UNAUTHORIZED=0`(上架前要正解)。

## 7. 里程碑與時程(目標，依實際進度調整)
> 單人開發步調為估計值，各階段保留緩衝;階段 1–3 為必做，4 與額外項為彈性。

| 期間 | 目標 |
|---|---|
| ~7/15 | ✅ 階段 1a / 1b / 2 / 3 + W8 打磨 + 首頁 Option A 啟動器改版 |
| 7/16–7/26 | 系統需求書內容初稿 → 企劃書內容初稿(Markdown 於 repo) |
| 7/24 | 訓練營(高雄場,直播;待確認直播是否算出席)— 取得官方文件撰寫方式;7/27 台中場為備案 |
| 7/25–8/3 | 依訓練營調整格式;內容灌入官方 .docx;demo 影片腳本 + 錄製 |
| 8/4–8/6 | 匿名檢查、PDF 匯出、上傳緩衝 |
| **8/7** | **初賽三件上傳截止 23:59** |
| 9/2 | 入圍決賽公告 |
| 9/3–10/23 | (若入圍)作品設計測試文件 + 功能補強 / 打磨 |
| 10/24–10/31 | 決賽攤位展示演練 |
| 11/1 | 決賽實地測試(國立中央大學) |

**已完成 UI 任務**
- 首頁 Option A 啟動器改版 — ✅ 完成(2026-07-14):`Main/index.js` 重排為「主決策 Mode + 情境 Exam 常駐 + 其餘設定收合為可見摘要(Customize ▸)」;topics 預設改全主題混合;移除重複的 CustomVocab 入口(Manage lists)。驗收:`npm run build` 通過(僅既有 CRA/browserslist 警告);electron-dev 手動驗證 core loop 正常;services 未動故既有 test-stage*/test-w8-* 不受影響。動到:`src/components/Main/index.js`、`src/index.css`。(見 DECISIONS #25)

## 8. 階段詳規

### 階段 1 — 修出題引擎
**目標**:解決「單字由上往下出 + 單調」，讓出題依「該練的程度 / 時機」。

#### 1a 加權隨機抽樣 — ✅ 完成(2026-06-23)
- 做了什麼:`selectAnswerWords()` 多層 sort → 加權隨機抽樣(A-Res log 形式);`weight = TIER_WEIGHT / (1 + times_as_answer) / (1 + consecutive_corrects)`;保留 exam 過濾與 mastered 兩組語意。
- 驗收結果:整庫 200×10 → 1888 種不同字(tier 41.4 / 36.8 / 21.8%);TOEIC 331 字全涵蓋;`npm run build` 通過。
- 動到:`src/services/vocab.js`(僅 `selectAnswerWords` + 兩個 helper)。

#### 1b 導入 SRS(間隔重複)— ✅ 完成(2026-06-29)
- 做了什麼:新增 `src/services/srs.js`(Leitner:`SRS_INTERVALS_DAYS=[0,1,2,4,7,14,30]`、`nextBox`/`dueFromBox`/`isDue`);`storage.js` 的 `updateWordStats()` 在答對/錯分支後、僅對答案字寫 `srs_box`/`srs_due`(誘答不排程);`vocab.js` 新增 `dueFirstSample`,選字 due 優先、不足才補未到期;1a 加權與 mastered 兩組語意不變。
- 驗收結果:`test-stage1b-srs-scheduling.mjs` 7 組全綠;`npm run build` 通過(僅既有 CRA/browserslist 警告)。
- 動到:`src/services/srs.js`(新)、`storage.js`(`updateWordStats` + shape 註解)、`vocab.js`(`selectAnswerWords` + `dueFirstSample`)。

### 階段 2 — 自訂單字範圍 / 匯入 — ✅ 完成(2026-07-06)
- 做了什麼:新增 `src/services/vocabImport.js`(純函式 `parseVocabText` — 一行一字、寬鬆行導向 parser,分隔符取「最先出現」的半形逗號 / Tab / 全形逗號 / 半形冒號,正規化成 vocab.json schema、去重、`frequency_tier:2` 讓自訂字進干擾詞池);`storage.js` 新增 `customVocabLists` + `vocabScope` 雙 key 的 CRUD;`vocab.js` 的 `selectDistractors` 加選填第 5 參 `fallbackBank`(小自訂表用內建庫補滿 4 選項);`Main/index.js` 依 scope 算 `activeBank`/`activeExam`(custom 繞過 exam 過濾、仍走 sortVocab),三個 drill 模式(vocab / defmatch / reversedrill)改用之,`selectAnswerWords`/quiz/part6/part7 不動;defmatch 於 custom scope 對重複中文選項去重;新 UI `CustomVocab` 元件(建立 / 匯入 / 選為範圍 / 刪除)+ 首頁範圍顯示與「缺中文→disable 兩個中文模式」。
- 驗收結果:`parseVocabText` 分隔符 / 去重 / trim 隔離驗證通過;`npm run build` 通過(僅既有 CRA/browserslist 警告)。**Ray 另跑附帶 node 測試腳本最終驗收。**
- 動到:`src/services/vocabImport.js`(新)、`storage.js`(custom lists + scope)、`vocab.js`(`selectDistractors` 第 5 參)、`Main/index.js`(scope 接線 + 首頁顯示 / disable)、`App/index.js`(路由)、`CustomVocab/index.js`(新)。
- 已知待辦:1a/1b 的加權隨機 + SRS 尚未接進三個 drill 模式(它們仍走 `sortVocab`);drills 整合列後續任務。

### 階段 3 — 錯題本強化 + 弱點路由 — ✅ 完成(2026-07-07)
- **目標**:把「弱點分析 → 自動排進下次出題」做紮實。**這是『個人化家教』的核心賣點。**
- 做了什麼:
  - **Track A(drills 確定性路由)**:`vocab.js` 的 `answerWeight` 加 `WEAK_BONUS=4` 乘數並貫穿 `weakSet`(`selectAnswerWords` 新增 `weakWords` option);三個 drill 模式(vocab / defmatch / reversedrill)由私有 `sortVocab` 改走 `selectAnswerWords`(`sortVocab` 已刪);`storage.js` 的 `getWeakVocabWords` 由僅 `'Vocabulary'` 擴為三個 drill quizType、視窗 -60 → -120。
  - **Track B(Part 5 prompt 可測)**:抽出純函式 `buildPart5Prompt`(新檔 `part5Prompt.js`,無 SDK / env / 網路;`DIFFICULTY_MAP` / `THEMES_LABEL` 移入並回匯 `llm.js`);`generatePart5` 改為委派該 builder。
  - **Part C(可視化)**:`Review` 上方新增「Weak vocabulary / Weak grammar points」摘要(次數由已載入的 wrongAnswers 就地統計),Part 5 錯題列補 `grammarPoint` 標籤。
- **驗收結果**:`test-stage3-weakness-routing.mjs` PASS — 加權路由 uplift **3.51x**(門檻 ≥ 2x)、control **1.02x**(~1x);`test-stage3-part5-payload.mjs` PASS — payload **100% supplied / 0% empty**。既有 `test-stage1b`(7 組全綠)、`test-stage2`(31/0)無回歸;`npm run build` 通過(僅既有 CRA/browserslist 警告)。
- **動到**:`vocab.js`(WEAK_BONUS + weakSet)、`storage.js`(`getWeakVocabWords` 擴大;弱點函式一向在 storage.js,非 llm.js)、`Main/index.js`(drills 改用 selectAnswerWords、刪 sortVocab、路由 weakVocab)、`part5Prompt.js`(新)、`llm.js`(委派 builder)、`Review/index.js`(弱點摘要 + 文法標籤);新增測試 `test-stage3-*.mjs`。
- **驗收標準**:測試腳本證明——某字 / 文法點被標記為弱點後,其在後續 M 次測驗的出現率顯著高於非弱點基準(給出數字)。**達成:uplift 3.51x vs control 1.02x。**

### 階段 4(Stretch)— 聽力(TTS)— 狀態:☐ Stretch
- **目標**:用 TTS 把現有閱讀題擴成聽力題。
- **僅在階段 1–3 完成且有餘裕時做。**
- **架構注意**:音訊播放是平台相關 → **必須放在 layer-2 服務介面後面**(見 CLAUDE.md)，不可直接在元件呼叫，否則破壞日後手機移植。
- **相依**:選一個 TTS 來源(成本 / 離線與否要評估)。
- **驗收標準**:至少一種題型能播放音檔作答;音訊走抽象介面;build 通過。

## 9. Backlog(上架後，非短期)
- **【CEEC 資料清理・已完成 2026-07-20】**(提前於 7/25 前執行,實際拆為 B1-B4):
  ① 資料來源改為官方 PDF 重抽(非 GPT 轉檔),產出 ceec-clean.json 6169 唯一詞條;
  ② build-vocab.mjs 派生 app 用 vocab.json(exams/pos-string/tier/category);
  ③ LLM 重生全部 6169 筆繁中釋義(enrich-meanings.mjs,多供應商,可續跑),覆蓋率 100%;
  ④ 舊多來源字集(牛津/金山/出處不明)已刪,舊管線腳本標 DEPRECATED;
  ⑤ source 全 'ceec'、exams 全 ['學測']。
  **驗收達成**:vocab.json 6169 字、meaning_zh 100%、word 欄無詞性殘留、stage 1a/1b/3 無回歸(distinct 1625 ≥ 1000)。
  (見 DECISIONS #34/#35)
  **待辦(後續任務)**:移除首頁考試選擇器 / 六模式歸一(§UI,錄 demo 前必做);category 學測化重分類;誤選誘答弱訊號。

### 近期待辦(B1-B4 之後,錄 demo 前需處理)

> 優先序:B7 > 門檻修正 > B6 > B5。B7 與門檻是 demo 阻斷/明顯缺陷,B6/B5 是增強。
> B7 與門檻修正都動 `src/components/Main/index.js`,建議同一任務一起做。

**B7 — 移除首頁考試選擇器 / 六模式歸一(最高優先,demo 阻斷)**
- 問題:vocab.json 現為單一學測字庫(exams 全 ['學測']),但首頁(#25 Option A)仍有
  常駐考試選擇器。使用者選 TOEIC/TOEFL/IELTS 會得到空字庫 → demo 當場破。
- 做法:移除考試選擇器 UI;六模式改吃單一 CEEC 字庫(不再依 activeExam 過濾)。
- 對應 DECISIONS #30 ④⑥(當時列於 7/25 資料任務,實際延到此)。
- 動到:src/components/Main/index.js(+ 可能 App/index.js 路由)。

**meaning_zh 短釋義門檻修正(高優先,與 B7 同檔,一起做)**
- 問題:Main/index.js 用 `meaning_zh.length > 3` 當「能否出意義題」門檻。此為舊多來源時代
  (簡體長句釋義)的產物。現在釋義是乾淨簡潔繁中,463 個正確短釋義(演員/蘋果/杏仁/鋁 等
  1-3 字)被此門檻誤擋,導致這些常用字在 DefinitionMatch/ReverseDrill 出不了題。
- 確認:vocab.json 6169 筆 meaning_zh 真正空的 = 0 筆;463 筆「缺中文」全是短於 4 字元的
  正確釋義被 length>3 誤判。
- 做法:把所有 `meaning_zh.length > 3` / hasZh gate 的門檻由 `> 3` 改為「非空」(length >= 1
  或 trim() 非空)。散在 Main/index.js 約 6-7 處 + CustomVocab/index.js hasZh。
- 注意:CustomVocab 的自訂字表也用同門檻(hasZh),一併確認是否要放寬(自訂字若填 1 字釋義
  應也可用)。

**B6 — category 學測化重分類(中優先,topic 過濾優化)**
- 問題:build-vocab.mjs 用舊 TOEIC 商業關鍵字啟發式(guessCategory)分類,對學測學術詞
  命中率極低 → 6169 字中 5995 是 'academic',topic 過濾(selectPriorityWords 用 category)
  在使用者選 business/finance 等主題時可用字極少。
- 做法:設計一套適合學測詞的分類(或改用 ceec_level/主題語意),取代 TOEIC 啟發式。
  具體方案待該任務開始時討論。
- 動到:scripts/build-vocab.mjs(guessCategory)+ 重跑 build。非 app 邏輯。

**B5 — 誤選誘答弱訊號(低優先,弱點路由增強)**
- 想法:使用者選錯時,被誤選的誘答字(沒被排除法排掉=可能不熟)也應計入弱訊號,不只
  記正確答案。
- 已定範圍:僅適用 Reverse Drill(該模式誘答才是「英文字」;Definition Match 誘答是中文意思、
  概念不成立;Vocabulary 模式有「認識該字只是用錯」的誤傷風險)。
- 設計原則(待實作時細化):誤選訊號【不直接進 SRS/streak】(那是被測驗字的機制),記獨立
  弱訊號,在 getWeakVocabWords 以【低於正面答錯】的權重納入;設較高門檻(誤選 N>2 次才計),
  避免高頻誘答字灌爆弱點池。
- 動到:src/services/storage.js(updateWordStats / getWeakVocabWords)。時機:B7 之後。

- 手機版(Capacitor 包同一份 `src/`)。
- 後端 API(LLM 代理、帳號、token 記帳、廣告 SSV 驗證);帳號同時持久化 per-user profile JSON(弱點/精熟/SRS 狀態 + 習慣/興趣/對話歷史),供 AI 家教跨裝置存取。上市即需此後端 + 主機,屬獨立階段、非 UI 任務。
- 看廣告換 token(AdMob 獎勵式 + 後端 SSV)。
- 換較便宜 LLM(如 DeepSeek)+ 單位經濟試算。
- 各考試(TOEIC/托福/雅思等)題型/順序/節奏模擬:以 CEEC 單字為內容,套各考試公開的應試格式跑整套模擬考。需先有跨題型流程引擎 + 聽力/口說/寫作題型。競賽版不含,企劃書未來發展描述。(見 DECISIONS #31)

**【後續其他競賽之強化候選(本競賽不做,見 DECISIONS #32,2026-07-20)】**
Ray 另有後續賽事,下列四項作為「那個競賽要加強的部分」保留,不在 NIICC 版實作:
- 整份模擬考流程(跨題型、分節計時、總分結算)—— 需先有跨題型流程引擎。
- 中譯英批改(新模式 + LLM 評分 prompt + UI)。
- 英文作文批改(同上,批改維度更多)。
- 各考試專屬題型(文意選填/篇章結構等)與順序/節奏複製。
(既有 §9 的寫作/口說/聽力/各考試模擬條目歸入此框架;競賽入圍後 9/3–10/23 才是評估加入的時機。)

— AI 家教能力擴充 —
- 寫作練習與 AI 批改(作文題 → LLM 評分 / 回饋)。
- AI 對話練習(情境對話、口說前的文字對話暖身)。
- 口說評測(STT + 發音 / 流暢度評分)— 最重,需 layer-2 音訊抽象(見 CLAUDE.md §3),與階段4 聽力 TTS 同屬平台相關,不可直接在元件呼叫。
- 聽力(TTS)— 已列於 §8 階段4(stretch),此處僅交叉引用,不重複規劃。
- AI 學習路徑導引(下一步學什麼):依考試結構排序(學測 詞彙→文法→閱讀→翻譯→作文;TOEIC 聽力→閱讀各 Part)。三層:①骨架=各考試靜態課綱(非 AI,考試結構即課綱);②個人化=以既有弱點/精熟資料做規則判斷,可據弱點自動調難度/題數;③AI 層=選配自然語言指導(耗 token→opt-in)。定位:核心差異化(市面給題庫,本案給學習路徑)。
- Agentic 家教(長期願景):LLM 讀取用戶 profile/歷史/興趣,作為有記憶的 agent 指導學習。架構原則:確定性計算(分數/SRS due/課綱位置/弱點)先算、結果餵 LLM 生成與溝通,不讓 LLM 追蹤狀態或算數。跨 session 記憶需後端持久化 → 綁定上方後端 API 項。競賽版不含。

- 【近期候選,優先於上列】答題頁側邊「問 AI」chat 窗:針對當前題目問「這題意思 / 文法點 / 單字」。
  技術上走現有 llm.js 呼叫路徑,無需新平台能力;強化 AI 家教定位、對 demo 說服力高。
  待 UI 改版任務(進行中)確立答題頁版面後,再評估是否排入近期迭代。

— 介面演進 —
- 桌面 IDE 式工作區(答題頁):可收合 right dock(AI)+ bottom dock(單字/文法解釋)+ left rail(區域導航:練習/錯題本/單字表/單字庫)。dock 隨對應功能落地時建置。(見 DECISIONS #25)
- AI 問答成本控制:問答入口預設走固定問題按鈕(如「不懂文法/某單字/某片語」),選項對應預寫 prompt 模板→ token 可控、品質穩;皆非時才開鍵盤自由輸入。桌面 dock 與手機皆適用。
- 手機版面適配:延續既有「手機版(Capacitor)」項——桌面 dock 不移植,center 作答為主,AI/解釋改 bottom-sheet 或分頁,導航走底部 tab。原則:面板內容平台無關、排列/停靠平台相關(CLAUDE.md §3),桌面 docks 與手機 sheets/tabs 共用同批內容元件。

## 10. 開放問題
- 聽力 TTS 來源(線上 API vs 本機)?
- 企劃書「6. 軟體清單 → 專案支援語言」要勾中文 / 英文?目前 UI 全英文但含中文釋義。
- 直播是否算出席?(簡章措辭推斷為是,待向主辦確認)
- 生成式 AI 揭露是否涵蓋開發期 AI 輔助?

## 11. 協作流程與每個任務的 handoff
**角色**:Ray = 架構 / 決策 / 測試;規劃對話(claude.ai)= 出提示詞 + 測試腳本;Claude Code = 實作。

**一個任務的完整一輪**:
1. (新對話)貼上該階段需要的程式碼 → 規劃對話產出 Claude Code 提示詞 + 測試腳本。
2. 先跑測試(修改前)→ 應失敗(重現問題)。
3. 貼提示詞給 Claude Code → 看 diff → Accept。
4. 再跑測試(修改後)→ 應通過。
5. **收尾(handoff)**:Claude Code 更新本檔該階段「狀態 + 驗收結果」;把新決策記到 `DECISIONS.md`;push。
6. 開下一個任務的新對話，先確保本檔 / `DECISIONS.md` 已是最新(refresh Project 連結，或貼最新版)。