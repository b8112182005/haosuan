# 好耶 Android 上架手冊

對象：持有 Google Play 開發者帳號的你。全部指令用 Git Bash，可直接貼上。

第一次上架只需要瀏覽器：1.0.0 的簽章版 AAB、測試用 APK、上傳金鑰都已交付，照第 0、2、3、4 節做。
之後要自己出新版才需要環境：用 CI 的話只要設 4 個 GitHub Secrets；在本機出的話要裝 Node 20+、JDK 17 或 21、Android Studio（含 SDK Platform 36 與 Build-Tools 36）。

套件名 `com.haosuan.haoti`，上架後不能改。

## 0. 一次性：上傳金鑰

**已經有一組**：1.0.0 的 AAB 是用 2026-11-14 產生的上傳金鑰簽的，金鑰檔（`upload-keystore.jks`、`keystore.properties`）隨 AAB 一起交付，不在 git 裡。
憑證 SHA-256：`E6:84:EA:8D:A4:3F:89:CC:92:A2:6D:F8:DD:EF:45:AD:D7:57:17:DB:F4:65:E4:C1:7D:9F:CE:3B:2E:22:9F:25`。

1. 把這兩個檔案存進密碼管理器。**先存好再上傳 AAB**：Play 會記住第一次上傳用的金鑰，之後每一版都要用同一把簽。
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

1.0.0 的簽章版 AAB 已經交付，第一次上架可以直接跳到第 2 節。之後的版本用下面兩種方式之一。

本機：

```bash
cd /c/Users/b8112/Projects/haosuan && npm ci && bash scripts/android/build-release.sh 1
```

最後一個參數是 versionCode，每次上傳 Play 都要比上一次大（1、2、3…）。
輸出：`android/app/build/outputs/bundle/release/app-release.aab`。

或者交給 CI：

```bash
cd /c/Users/b8112/Projects/haosuan && git tag v1.0.0 && git push origin v1.0.0
```

GitHub Actions 會用 `github.run_number` 當 versionCode，AAB 在 workflow 的 Artifacts 裡下載。
出包前 CI 會先跑 `npm run qa:native`：用模擬的 Android 原生端檢查返回鍵、通知排程、通知點擊，沒過就不出 AAB。

## 1.5 先裝到自己的手機測（10 分鐘）

把交付的 `haoye-1.0.0.apk` 傳到手機，點開安裝（第一次要允許「安裝未知應用程式」）。這幾項只有實機看得到，請走一遍：

| 檢查 | 怎麼做 | 應該看到 |
|---|---|---|
| 通知會響 | 提醒頁新增一筆、日期選明天、提前天數選「當天」與「1 天」 | 允許通知後，隔天早上 9 點前後收到（用的是非精確鬧鐘，可能晚幾分鐘） |
| 返回鍵 | 開「加入提醒」面板按返回；試算答到第 3 題按返回；在首頁按返回 | 依序是：面板關掉、回第 2 題、離開 app |
| 外部連結 | 補助詳情頁按「前往申請」 | 在 app 內開一個瀏覽器分頁，按返回回到 app |
| 版面 | 看頂端狀態列與底部分頁列 | 內容沒有被狀態列或手勢列蓋住 |
| 點通知 | 收到通知後點它 | 開到那一筆補助的頁面 |

這個 APK 用上傳金鑰簽章，Play 發下來的版本用 Google 的金鑰簽章，兩者不能互相覆蓋：要改裝 Play 的內部測試版時，先把這個解除安裝。

## 2. Play Console 建立 app（15 分鐘，只做一次）

1. [play.google.com/console](https://play.google.com/console) → 建立應用程式
   - 名稱：好耶
   - 預設語言：中文（繁體）
   - 應用程式／遊戲：應用程式；免費
2. 左側「測試與發布 → 內部測試」→ 建立新版本 → 上傳 `app-release.aab`
   - 第一次上傳會要求啟用 Play App Signing，選「使用 Google 產生的金鑰」（你的 jks 當上傳金鑰）
   - 版本資訊貼 `store/listing.md` 的「版本說明」
3. 「測試人員」分頁加入自己的 Gmail → 儲存 → 審查並發布。幾分鐘後用測試連結安裝到手機驗證。

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
| 廣告 | 否，不含廣告 |
| 應用程式存取權 | 所有功能無需登入即可使用 |
| 內容分級 | 問卷全部選「否」→ 會得到「所有人」 |
| 目標對象 | 18 歲以上（內容為成人財務／補助資訊；不針對兒童） |
| 新聞應用程式 | 否 |
| COVID-19 | 否 |
| 資料安全 | 見下表 |
| 政府應用程式 | 否（個人開發者整理公開資訊） |
| 金融功能 | 否（只有試算，不提供貸款或投資） |

資料安全表單：

| 問題 | 答案 |
|---|---|
| 是否收集或分享使用者資料 | 否 |
| 資料是否加密傳輸 | 是（只對 haosuan.vercel.app 做 HTTPS GET） |
| 使用者能否要求刪除資料 | 不適用（沒有收集） |

說明：提醒與試算條件只存在裝置的 app 私有儲存空間；app 不含分析 SDK；唯一的網路請求是下載補助資料檔。

## 5. 正式上架

內部測試用一週沒問題後：「測試與發布 → 正式版」→ 建立新版本 → 從內部測試「升階」→ 填版本說明 → 送審。
第一次審核通常 1～7 天。

## 6. 之後每次更新

1. `package.json` 的 `version` 改成新版號（例如 1.0.1）
2. commit 後 `git tag v1.0.1 && git push origin v1.0.1`，或本機 `bash scripts/android/build-release.sh <更大的 versionCode>`
3. Play Console 上傳新 AAB

補助資料怎麼更新：改 `research/` 後跑 `npm run data:build -- --version YYYY-MM-DD`，push 到 main，Vercel 部署完成後——

- **網站**：立刻是新資料。
- **已安裝的 app**：啟動時會抓 `/data/subsidies.json`。既有項目的金額、期限、是否辦理、官方網址有變動時，該項目頁頂端會出現「有較新的資料」提示並列出差異。
- **新增的項目、改寫的說明與問答**：是打包在 app 裡的頁面，要發新版 app（重跑第 1 節、versionCode 加 1）才會出現。

## 7. 自動上傳（選用）

想省掉手動上傳：Play Console → 設定 → API 存取 → 建立服務帳戶，給它「發布版本」權限，下載 JSON 金鑰，整個 JSON 內容放到 GitHub Secret `PLAY_SERVICE_ACCOUNT_JSON`。之後每次 push tag，CI 會直接上傳到內部測試軌道。
