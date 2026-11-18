# 本機工作：用 Ollama 做不需要雲端模型的事

給維護者看。這三支腳本在你的 Windows 電腦（Git Bash）上跑，用本機的 Ollama 做兩件事：把貼文改寫成不同語氣、初步判讀政府網頁的變動。

專案路徑：`/c/Users/b8112/Projects/haosuan`。下面的指令都帶完整路徑，可以直接貼進 Git Bash。

> 這些腳本在開發時只用假的 Ollama 伺服器測過，沒有對真的 Ollama 跑過。第一次用請先拿一則貼文、一兩個項目試跑，看輸出合不合理。

## 先決條件

- Node 20 以上。`post-variants.mjs` 與 `watch-official-pages.mjs` 只用 Node 內建模組，不用 `npm install`。
- `deadline-digest.mjs` 要 Node 22.18 以上才能在本機跑（它直接讀 `src/lib/subsidy` 的 `.ts` 檔）。
- Ollama 在執行中，預設網址 `http://127.0.0.1:11434`。

## 什麼不能信

本機模型的輸出只是草稿：

- **不直接發文。** `post-variants.mjs` 會用程式比對改寫稿的數字、網址和聲明句，沒通過的不輸出內文；通過的仍然要你自己讀一遍再貼。程式只能確認「數字沒變」，看不出語氣有沒有怪、有沒有把意思講反。
- **不直接改資料。** `watch-official-pages.mjs` 的報告和模型判讀只是線索。要改資料時，打開網頁核對原文，改 `research/`，再跑 `npm run data:build`。不要手改 `src/data/subsidies.json`。
- 模型可能判錯「有沒有影響截止日」。判讀標題寫著「要對照網頁確認」，照字面做。

## 指定模型：OLLAMA_HOST、OLLAMA_MODEL

先看本機有哪些模型：

```bash
ollama list
```

沒有任何模型時先下載一個，例如 `ollama pull qwen2.5:7b`（模型名稱自己挑，改寫繁體中文的效果要自己試）。

| 環境變數 | 預設 | 用途 |
|---|---|---|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 的網址；Ollama 在別台電腦時才要改 |
| `OLLAMA_MODEL` | `ollama list` 的第一個 | 要用哪個模型 |

只在這一次指令生效：

```bash
cd /c/Users/b8112/Projects/haosuan && OLLAMA_MODEL=qwen2.5:7b node scripts/local/watch-official-pages.mjs --ollama --out .local/watch-report.md
```

之後都想用同一個模型，把 `export OLLAMA_MODEL=qwen2.5:7b` 加到 `~/.bashrc`。

連不上 Ollama、等超過 2 分鐘、沒有任何模型時，腳本會說明原因和下一步（例如「先確認 Ollama 有在執行：ollama list」）。

## 1. scripts/local/watch-official-pages.mjs：看政府網頁有沒有變

做什麼：抓 `src/data/subsidies.json` 裡項目的 `official_url`，轉成純文字，和上次的快照比對，列出新增與消失的句子。

預設只看會突然變的項目：`deadline.budget_limited` 為 true、`status_2026` 是 `pending`、有 `year_end_notice`、名稱含「115」「116」。

```bash
# 預設的項目，報告寫到檔案
cd /c/Users/b8112/Projects/haosuan && node scripts/local/watch-official-pages.mjs --out .local/watch-report.md

# 加上本機模型的初步判讀
cd /c/Users/b8112/Projects/haosuan && node scripts/local/watch-official-pages.mjs --ollama --out .local/watch-report.md

# 全部項目
cd /c/Users/b8112/Projects/haosuan && node scripts/local/watch-official-pages.mjs --all --out .local/watch-report.md

# 指定項目（id 在 src/data/subsidies.json 或 /subsidy/<id> 的網址裡）
cd /c/Users/b8112/Projects/haosuan && node scripts/local/watch-official-pages.mjs --ids rent-subsidy-central-300b
```

| 參數 | 用途 |
|---|---|
| `--all` | 看全部項目 |
| `--ids a,b` | 只看這些 id |
| `--ollama` | 有變動的項目請本機模型判讀 |
| `--out report.md` | 報告寫到檔案；不給就印在畫面上 |
| `--snapshots <dir>` | 快照資料夾，預設 `.local/snapshots/` |
| `--data <path>` | 補助資料檔，預設 `src/data/subsidies.json` |

輸出：

- 快照：`.local/snapshots/<id>.txt`，一個項目一個檔。`.local/` 已加進 `.gitignore`，不會進 git。
- 報告（Markdown）：依序是「有變動」「抓不到」「新增快照」，「沒變」只寫數量。
- 第一次跑每個項目都是「新增快照」，要第二次跑才有東西可比。

要知道的限制：

- 網頁上有「今天日期」「瀏覽人次」這類會自己變的文字，那個項目每次都會列為有變動。看到固定的雜訊句子，記得它是雜訊就好，腳本目前不會自動排除。
- 靠 JavaScript 才顯示內容的網頁，抓到的文字很少，會列在「抓不到」。這類要自己打開看。
- 網址是 PDF 的列在「抓不到」，腳本只處理 HTML。
- 這支腳本不寫 `research/`、`src/data/`，也不發任何訊息。

## 2. scripts/marketing/post-variants.mjs：貼文改寫成不同語氣

做什麼：讀 `deadline-digest.mjs` 的輸出，取出「Threads／Facebook（一則）」那則貼文，請本機模型改寫成兩種語氣（預設「口語，像朋友提醒」「正式，適合社團公告」），再檢查改寫稿。

輸入：`digest.md`（`deadline-digest.mjs` 的輸出），或從 stdin 讀。

輸出（Markdown）：通過檢查的改寫稿各放一個 `text` 區塊；沒通過的只列原因，不輸出內文。全部沒通過時最後一行是「0 則通過，請直接用原文」，指令仍然正常結束。

檢查項目，任何一項不符就不通過：

- 數字記號和原文不完全相同（11/30 算一個記號；5,000 與 5000 視為相同；全形數字先轉半形）。注意貼文裡的條列編號 1. 2. 3. 也算數字，模型拿掉編號就會被擋。
- 網址和原文不完全相同。
- 沒有「不是政府網站」這句。
- 出現「官方」「保證」「政府推出」「一定領得到」。
- 長度超過原文 1.5 倍。

```bash
cd /c/Users/b8112/Projects/haosuan && node scripts/marketing/post-variants.mjs digest.md

# 換語氣，用 | 分開
cd /c/Users/b8112/Projects/haosuan && node scripts/marketing/post-variants.mjs digest.md --tones "口語，像朋友提醒|簡短，一句話講完"

# 從 stdin
cd /c/Users/b8112/Projects/haosuan && cat digest.md | node scripts/marketing/post-variants.mjs
```

### 拿到 digest.md

每週一 GitHub 會自動開一個 issue，內文就是 digest。有兩條路：

1. Node 22.18 以上：直接在本機產生。
   ```bash
   cd /c/Users/b8112/Projects/haosuan && node --no-warnings scripts/marketing/deadline-digest.mjs > digest.md
   ```
   `node -v` 看版本。
2. Node 版本不夠：打開那週的 issue，複製內文，存成 `digest.md`（放在專案資料夾，或任何路徑），再餵給 `post-variants.mjs`。

## 3. scripts/marketing/deadline-digest.mjs：每週摘要

GitHub Actions 每週一自動跑並開 issue（見 `.github/workflows/marketing-weekly.yml`），不用自己排。這次加了兩個東西：

- `deadline.budget_limited` 為 true 的項目，那一行後面會寫「（經費用完會提前結束）」。
- 「## 年底提醒（N）」：今天落在 `year_end_notice` 區間內、`status_2026` 是 `active` 的項目，各一個 `text` 區塊，可以直接貼。沒有的話寫「無」。目前資料還沒有這兩個欄位，所以這一節現在是「無」。

## 排程：Windows 工作排程器（每週一）

> 這一段沒有在 Windows 上實測過。照著做完，先手動按「執行」確認一次，再等週一。

只建議排 `watch-official-pages.mjs`。`post-variants.mjs` 要先有 digest.md，而且輸出你得讀過才能貼，不適合無人看管地跑。

1. 開始功能表搜尋「工作排程器」，打開。
2. 右邊點「建立基本工作」。
3. 名稱填「好耶 官網變動檢查」，下一步。
4. 觸發程序選「每週」，下一步；開始日期選下一個週一，時間填 09:00，勾「星期一」，下一步。
5. 動作選「啟動程式」，下一步。
6. 「程式或指令碼」填 Git Bash 的 bash.exe，常見路徑是 `C:\Program Files\Git\bin\bash.exe`（路徑不同的話，在檔案總管找 Git 安裝資料夾裡的 `bin\bash.exe`）。
7. 「新增引數」填：
   ```
   -lc "cd /c/Users/b8112/Projects/haosuan && node scripts/local/watch-official-pages.mjs --ollama --out .local/watch-report.md"
   ```
8. 完成。之後在工作清單裡對這個工作按右鍵，「內容」→「一般」：勾「不論使用者登入與否均執行」前先想清楚，Ollama 若是以登入後的桌面程式在跑，這樣設會連不到它；建議維持「只在使用者登入時才執行」。
9. 筆電要勾「內容」→「條件」→ 取消「只有在電腦使用 AC 電源時才啟動」，否則用電池時整次跳過。
10. 對工作按右鍵「執行」，確認 `.local/watch-report.md` 有出現。

排程跑完不會通知你。週一開始工作前自己打開 `.local/watch-report.md`；要通知的話之後再加。

## 疑難排解

| 看到 | 原因與下一步 |
|---|---|
| `連不到 Ollama（http://127.0.0.1:11434）` | Ollama 沒開。開啟 Ollama 程式，再跑 `ollama list` 確認 |
| `Ollama（…）裡沒有任何模型` | `ollama pull qwen2.5:7b`（或別的模型） |
| `…秒內沒有回應` | 模型第一次載入要時間，先 `ollama run <模型名稱>` 讓它載入；或改用較小的模型 |
| `找不到模型 …` | `OLLAMA_MODEL` 打錯了，`ollama list` 看正確名稱 |
| 報告的「抓不到」很多 | 先看原因欄：`HTTP 403` 多半是網站擋自動程式，`逾時` 可能是網站慢或網路問題。換時間再跑一次 |
