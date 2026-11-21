# 好耶 Android 上架手冊

對象：持有 Google Play 開發者帳號的你。全部指令用 Git Bash，可直接貼上。

第一次上架只需要瀏覽器：1.2.0 的簽章版 AAB、測試用 APK、上傳金鑰都已交付，照第 0、2、3、4、5 節做。個人帳號從建立封閉測試到能送正式版，最快約 3 週（14 天測試加最多 7 天審查）。
之後要自己出新版才需要環境：用 CI 的話只要設 4 個 GitHub Secrets；在本機出的話要裝 Node 20+、JDK 17 或 21、Android Studio（含 SDK Platform 36 與 Build-Tools 36）。

套件名 `com.haosuan.haoti`，上架後不能改。

## 0. 一次性：上傳金鑰

**已經有一組**：交付的 AAB 是用 2026-11-14 產生的上傳金鑰簽的，金鑰檔（`upload-keystore.jks`、`keystore.properties`）隨 AAB 一起交付，不在 git 裡。
憑證 SHA-256：`E6:84:EA:8D:A4:3F:89:CC:92:A2:6D:F8:DD:EF:45:AD:D7:57:17:DB:F4:65:E4:C1:7D:9F:CE:3B:2E:22:9F:25`。

1. 把這兩個檔案存進密碼管理器。**先存好再上傳 AAB**：Play 會記住第一次上傳用的金鑰，之後每一版都要用同一把簽。2026-11-19 已另存一份壓縮檔在帳戶持有人自己的 Google 雲端硬碟（沒有分享給任何人）。
2. 之後要在本機出新版，把兩個檔案放到 repo 的 `android/` 底下（都在 .gitignore）。
3. 遺失時到 Play Console「應用程式完整性 → 應用程式簽署 → 要求重設上傳金鑰」申請換一把，要等 Google 處理。

想換成自己在本機產生的金鑰（要在第一次上傳 AAB 之前決定）：

```bash
cd /c/Users/b8112/Projects/haosuan && bash scripts/android/make-keystore.sh
```

會產生 `android/upload-keystore.jks` 與 `android/keystore.properties`，再照第 1 節重出 AAB。需要 JDK 的 keytool。

把金鑰放到 GitHub Secrets（Settings → Secrets and variables → Actions → New repository secret）：

| Secret | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android/upload-keystore.jks` 的輸出 |
| `ANDROID_KEYSTORE_PASSWORD` | `keystore.properties` 裡 `storePassword=` 後面的值 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 同上（`keyPassword=` 的值，和 storePassword 相同） |

Git Bash 產 base64：

```bash
cd /c/Users/b8112/Projects/haosuan && base64 -w0 android/upload-keystore.jks | clip
```

（`clip` 直接複製到剪貼簿。）

## 1. 產出 AAB（每次發版）

1.2.0 的簽章版 AAB 已經交付，第一次上架可以直接跳到第 2 節。之後的版本用下面兩種方式之一。

本機：

```bash
cd /c/Users/b8112/Projects/haosuan && npm ci && bash scripts/android/build-release.sh 1
```

最後一個參數是 versionCode，每次上傳 Play 都要比上一次大。我交付的 `haoye-1.2.0-b9` 是 9，本機再出包從 10 開始。
輸出：`android/app/build/outputs/bundle/release/app-release.aab`。

或者交給 CI：

```bash
cd /c/Users/b8112/Projects/haosuan && git tag v1.2.0 && git push origin v1.2.0
```

GitHub Actions 用 `100 + run_number` 當 versionCode（artifact 名稱結尾的 `v104` 這類數字就是它），一定比本機出過的 1～8 大，兩種方式混用不會被 Play 拒收。AAB 在 workflow 的 Artifacts 裡下載。
出包前 CI 會先跑 `npm run qa:native`：用模擬的 Android 原生端檢查返回鍵、通知排程、通知點擊，沒過就不出 AAB。

## 1.5 先裝到自己的手機測（10 分鐘）

把交付的 `haoye-1.2.0-b9.apk` 傳到手機，點開安裝（第一次要允許「安裝未知應用程式」）。這幾項只有實機看得到，請走一遍：

| 檢查 | 怎麼做 | 應該看到 |
|---|---|---|
| 通知會響 | 提醒頁新增一筆、日期選明天、提前天數選「當天」與「1 天」 | 允許通知後，隔天早上 9 點前後收到（用的是非精確鬧鐘，可能晚幾分鐘） |
| 返回鍵 | 開「加入提醒」面板按返回；試算答到第 3 題按返回；在首頁按返回 | 依序是：面板關掉、回第 2 題、離開 app |
| 外部連結 | 補助詳情頁按「前往申請」 | 在 app 內開一個瀏覽器分頁，按返回回到 app |
| 版面 | 看頂端狀態列與底部分頁列 | 內容沒有被狀態列或手勢列蓋住 |
| 系統導覽列 | Android 8.1～14、系統導覽設成「三鍵」的手機，看螢幕最底下那一排 | 白底、深色的返回／主畫面／最近使用按鈕（不是黑底上看不清楚的深色按鈕） |
| 橫放 | 開自動旋轉，把手機橫過來 | 底部 5 個分頁還在；內容沒有被兩側的鏡頭開孔或側邊導覽列蓋住 |
| 點通知 | 收到通知後點它 | 開到那一筆補助的頁面 |
| 自己挑辦理日的提醒 | 「中央租金補貼」頁按「加入提醒」，日期選明天，提前天數選「當天」與「前 1 天」 | 面板欄位寫「哪一天去辦」；通知標題是「明天要辦：中央租金補貼」「今天要辦：…」，內文以「預定」開頭，後面接「從申請日起撥，晚送少領」 |
| 年底提醒卡 | 11/1～12/31 之間開「補助」分頁 | 最上面有「今年出生的寶寶，12/31 前送育兒津貼」卡片；1/1 之後不再出現 |
| 試算結果回到原位 | 填完 7 題，在結果頁選「居住」分類、往下捲幾列，點一項進去，再按返回鍵 | 回到結果頁時仍是「居住」，停在剛才那一列附近；項目頁有「你的條件比對」 |
| 試算結果的分類籤 | 在結果頁一路往下捲 | 分類籤那一排黏在頁首下面，沒有蓋到內容，也沒有和底部分頁列重疊 |
| 重填與補答 | 結果頁按「重填」；另外只答縣市與年齡就按「直接看結果」，再按「補答」 | 「重填」先問一次；「補答」直接到第 3 題（收入），答完按鍵盤的下一步是第 4 題 |

這個 APK 用上傳金鑰簽章，Play 發下來的版本用 Google 的金鑰簽章，兩者不能互相覆蓋：要改裝 Play 的內部測試版時，先把這個解除安裝。

## 2. Play Console 建立 app（15 分鐘，只做一次）

1. [play.google.com/console](https://play.google.com/console) → 建立應用程式
   - 名稱：好耶
   - 預設語言：中文（繁體）
   - 應用程式／遊戲：應用程式；免費
2. 先確認帳號類型（Play Console 左下「設定 → 開發人員帳戶 → 帳戶詳細資料」）。**2023-11-13 以後建立的個人帳號**，要先跑封閉測試才能申請正式版：至少 12 位測試人員、連續加入 14 天（[官方說明](https://support.google.com/googleplay/android-developer/answer/14151465)，2026-11-15 查證）。機構帳號沒有這條。
3. 內部測試（給自己裝，幾分鐘就能用，不算進 14 天）：「測試與發布 → 測試 → 內部測試」→ 建立新版本 → 上傳 `app-release.aab`
   - 第一次上傳會要求啟用 Play App Signing，選「使用 Google 產生的金鑰」（你的 jks 當上傳金鑰）
   - 版本資訊貼 `store/listing.md` 的「版本說明」
   - 「測試人員」分頁加入自己的 Gmail → 儲存 → 審查並發布，用測試連結安裝到手機驗證
4. 封閉測試（個人帳號必做）：「測試與發布 → 測試 → 封閉測試」→ 建立測試群組 → 建立新版本（可以直接沿用內部測試那一版）
   - 「測試人員」分頁選「電子郵件清單」，貼上測試者的 Gmail（一行一個），或用 Google 網路論壇管理名單
   - 複製「加入測試的連結」傳給測試者：對方用同一個 Gmail 打開連結、按「成為測試人員」，再從 Play 安裝
   - 第 4 節的政策表單和第 3 節的商店資訊要先填完，封閉測試版本才送得出審查
   - 14 天從第 12 位測試者加入那天起算，中途有人退出就要補人；建議找 15 位以上
   - 邀請訊息、測試者任務清單、時程、回饋紀錄表、申請正式版問卷的答案草稿：`docs/CLOSED_TEST.md`

## 3. 商店資訊（Play Console → 主要商店資訊）

全部文案在 `store/listing.md`，圖片在 `store/`：

| 欄位 | 檔案／內容 |
|---|---|
| 應用程式圖示 512×512 | `store/icon-512.png` |
| 主題圖片 1024×500 | `store/feature-graphic-1024x500.png` |
| 手機螢幕截圖（至少 2 張） | `store/screenshots/phone-*.png` |
| 簡短說明（80 字內） | listing.md |
| 完整說明（4000 字內） | listing.md |
| 應用程式類別 | 工具 |
| 聯絡電子郵件 | b8112182005@gmail.com |
| 隱私權政策網址 | https://haosuan.vercel.app/privacy |

## 4. 政策表單（Play Console → 應用程式內容）

| 項目 | 答案 |
|---|---|
| 隱私權政策 | https://haosuan.vercel.app/privacy |
| 廣告 | 否，不含廣告。網站上的瑀墨推廣區塊與模板包、LINE 方案的按鈕只在網站顯示（`.web-only`），app 內看不到，`npm run qa:native` 有檢查；app 也就沒有導去 Play 以外的管道購買數位內容 |
| 應用程式存取權 | 所有功能無需登入即可使用 |
| 內容分級 | 問卷全部選「否」→ 會得到「所有人」 |
| 目標對象 | 18 歲以上（內容為成人財務／補助資訊；不針對兒童） |
| 新聞應用程式 | 否 |
| COVID-19 | 否 |
| 資料安全 | 見下表 |
| 政府應用程式 | 否（個人開發者整理公開資訊）。商店說明第一段已寫「不是政府機關的 app」並列出主要政府來源網址 |
| 金融功能 | 否（只有試算，不提供貸款或投資） |
| 健康應用程式聲明 | 每個 app 都要填，封閉測試也一樣（[官方說明](https://support.google.com/googleplay/android-developer/answer/14738291)）。勾「營養與體重管理」（BMI、熱量計算機）、「睡眠管理」（睡眠時間計算）、「生殖與性健康」（懷孕週數計算機） |

健康應用程式聲明的說明：官方頁面沒有寫單純的計算機算不算健康功能（2026-11-15 查證），這是我的判斷。照實勾選比勾「沒有任何健康功能」安全；四個計算機頁都已寫明「不是醫療建議」與該問醫師的情況。懷孕週數沒有專屬類別，「生殖與性健康」是最接近的一項。

資料安全表單：

| 問題 | 答案 |
|---|---|
| 是否收集或分享使用者資料 | 否 |
| 資料是否加密傳輸 | 是（只對 haosuan.vercel.app 做 HTTPS GET） |
| 使用者能否要求刪除資料 | 不適用（沒有收集） |

說明：提醒與試算條件只存在裝置的 app 私有儲存空間；app 不含分析 SDK；唯一的網路請求是下載補助資料檔。

為什麼「是否收集」答否：Play 對「收集」的定義是「把資料從 app 傳出裝置」。這個 app 傳出去的只有一個不帶參數的 HTTPS GET，沒有使用者資料。網站主機商 Vercel 會在連線紀錄留下 IP 位址，隱私權政策第三節已寫明；Play 的說明頁只要求「用 IP 推算大概位置」時申報位置，好耶沒有這樣做。官方說明沒有直接處理「主機連線紀錄」這種情況（2026-11-15 查證），如果審查要求修改，照審查意見改。

## 5. 正式上架

機構帳號：內部測試用過沒問題後，「測試與發布 → 正式版」→ 建立新版本 → 從內部測試「升階」→ 填版本說明 → 送審。

個人帳號（第 2 節第 4 步的封閉測試跑滿 14 天、測試人員 12 位以上之後）：

1. 資訊主頁會出現「申請正式版存取權」，申請表分三段：封閉測試、應用程式、正式版準備程度。封閉測試那段要寫「測試者給了哪些回饋、怎麼收集的」，所以測試期間要留下回饋紀錄（app 的「更多 → 意見回饋」會開一封寄給聯絡信箱的信）
2. 審查通常 7 天內（官方寫法是「通常不超過七天，偶爾會更久」）
3. 通過後「測試與發布 → 正式版」→ 建立新版本 → 從封閉測試「升階」→ 送審

## 6. 之後每次更新

1. `package.json` 的 `version` 改成新版號（例如 1.0.1）
2. commit 後 `git tag v1.0.1 && git push origin v1.0.1`，或本機 `bash scripts/android/build-release.sh <更大的 versionCode>`
3. Play Console 上傳新 AAB

補助資料怎麼更新：改 `research/` 後跑 `npm run data:build -- --version YYYY-MM-DD`，push 到 main，Vercel 部署完成後——

- **網站**：立刻是新資料。
- **已安裝的 app**：啟動時會抓 `/data/subsidies.json`。既有項目的金額、期限、是否辦理、官方網址有變動時，該項目頁頂端會出現「有較新的資料」提示並列出差異。
- **新增的項目、改寫的說明與問答**：是打包在 app 裡的頁面，要發新版 app（重跑第 1 節、versionCode 加 1）才會出現。

## 7. 自動上傳（選用）

CI 能代勞的是第二版以後的上傳。Google 的文件寫明這支 API 只能改「已經存在、而且至少上傳過一個版本」的 app，發行要按的法律同意也只能在後台做（[Edits 說明](https://developers.google.com/android-publisher/edits)，2026-11-21 讀）。所以這三件事一定要本人在 Play Console 做一次：建立 app、上傳第一個 AAB（第 2 節）、填政策表單（第 4 節）。

做完之後設定服務帳戶（[官方步驟](https://developers.google.com/android-publisher/getting_started)）：

1. [Google Cloud Console](https://console.cloud.google.com/) 建一個專案（已有就沿用），啟用「Google Play Android Developer API」。開發人員帳戶不用再和這個專案連結。
2. 在同一個專案建立服務帳戶，產生 JSON 金鑰並下載。
3. Play Console →「使用者和權限」→ 邀請新使用者：電子郵件填服務帳戶的地址（結尾是 `iam.gserviceaccount.com`），應用程式選「好耶」，權限勾 Release apps to testing tracks 與 Manage store presence（中文介面的名稱以後台顯示為準）。
4. GitHub repo → Settings → Secrets and variables → Actions，新增 `PLAY_SERVICE_ACCOUNT_JSON`（貼 JSON 全文），以及 `.github/workflows/app-build.yml` 檔頭列的 4 個 `ANDROID_*`。

之後 push tag 或手動執行「App Build (Android)」，CI 會簽章並上傳到指定軌道（預設內部測試）。

## 8. 帳戶層級：聲明交易商狀態（2027-02-01 前）

Google Play 2026-11-04 寄給所有開發人員的通知：不論所在地，都要在 Play Console 聲明自己是交易商或非交易商；沒在 2027-02-01 前完成，之後不能提交更新，開發人員個人檔案和所有 app 會下架。

位置：Play Console →「管理帳戶」→「帳戶詳細資料」→「個人資訊」→「交易商狀態」。

- 通知原文：透過 app 賺取收益（付費下載、app 內商品、訂閱、廣告）通常會被視為交易商；純粹出於興趣或非商業用途可以聲明為非交易商；沒有在歐洲經濟區或英國發行 app，可以聲明為非交易商。
- 個人帳戶聲明為交易商，要提供並驗證公開電話，電話和地址會公開顯示在 Google Play。
- 好耶目前免費、沒有廣告與 app 內購買，發行國家只選台灣時，符合通知寫的非交易商條件。之後如果在 app 裡收費，要回來重新判斷。
- 不實陳述屬於違反開發人員發行協議，可能下架或停權。這一項由帳戶持有人自己負責判斷。
