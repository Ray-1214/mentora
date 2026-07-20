# 詞彙資料來源與管線

## 權威來源
`ceec-clean.json` — 大考中心《高中英文參考詞彙表》（111學年度起適用）官方 PDF 直接重抽。
- 6169 個唯一詞條，欄位含 word / pos(陣列) / ceec_level(1-6) / lemma_group 等。
- 版權：財團法人大學入學考試中心基金會所有，僅供非營利使用，轉載註明出處；營利使用須事前書面授權。
- 級別：PDF 內含依級別/依字母兩版，衝突約 5% 詞彙採「依字母排序」版為準。

## 產線
`ceec-clean.json` → (scripts/build-vocab.mjs) → `vocab.json`（app 實際讀取）。

## 已廢棄（DEPRECATED，勿執行）
`scripts/parse-ceec.js`、`scripts/fetch-vocab.js`、`scripts/rebuild-vocab.js`
——舊多來源管線（含牛津 OALD8 / 金山 TOEFL / 出處不明 TOEIC），已於 2026-07-20 停用。
`test-a1-ceec-parse.mjs` 測試的 parseCeecEntries 已不在資料路徑上，僅存作歷史。
