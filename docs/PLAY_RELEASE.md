# 好耶 Android 上架手冊

對象：持有 Google Play 開發者帳號的你。全部指令用 Git Bash，可直接貼上。
前提：PC 已裝 Node 20+、JDK 17 或 21、Android Studio（含 SDK Platform 36 與 Build-Tools 36）。

套件名 `com.haosuan.haoti`，上架後不能改。

## 0. 一次性：產生上傳金鑰（5 分鐘）

```bash
cd /c/Users/b8112/Projects/haosuan && bash scripts/android/make-keystore.sh
```

會產生 `android/upload-keystore.jks` 與 `android/keystore.properties`（兩個都在 .gitignore）。
**把這兩個檔案備份到密碼管理器。** 遺失金鑰就無法更新 app（Play App Signing 可申請重設，但要等 Google 審核）。

把金鑰放到 GitHub Secrets（Settings → Secrets and variables → Actions → New repository secret）：

| Secret | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android/upload-keystore.jks` 的輸出 |
| `ANDROID_KEYSTORE_PASSWORD` | 你剛輸入的密碼 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 同 keystore 密碼 |

Git Bash 產 base64：

```bash
cd /c/Users/b8112/Projects/haosuan && base64 -w0 android/upload-keystore.jks | clip
```

（`clip` 直接複製到剪貼簿。）

## 1. 本機產出 AAB（每次發版）

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

補助資料更新不需要發新版 app：改 `src/data/subsidies.json`（或重跑 `npm run data:build`）→ push 到 main → Vercel 部署後，app 啟動時會自己抓新資料。

## 7. 自動上傳（選用）

想省掉手動上傳：Play Console → 設定 → API 存取 → 建立服務帳戶，給它「發布版本」權限，下載 JSON 金鑰，整個 JSON 內容放到 GitHub Secret `PLAY_SERVICE_ACCOUNT_JSON`。之後每次 push tag，CI 會直接上傳到內部測試軌道。
