# 沒有 Mac 怎麼出 iOS 版

查證日期：2026-11-21。對象：只有 Windows 電腦與 iPhone 的維護者。標「未驗證」的是沒讀到官方原文或沒實測的部分。

## 結論

- **建得出來，已實測。** `.github/workflows/ios-build.yml` 在 GitHub 的 macOS 建置機上從原始碼建出 iOS 模擬器版並開起來截圖，全程沒有碰到任何 Mac。第一次執行（run 44932983815，2026-11-21）整趟 12 分 36 秒：安裝套件 86 秒、建置網頁 33 秒、產生 iOS 專案 5 秒、Xcode 建置 112 秒，其餘是開模擬器與截圖。
- **要裝到真的 iPhone 或上架，一定要付 Apple Developer Program 年費 US$99。** 沒付費的帳號不能用 TestFlight、不能上架。這是唯一必花的錢；建置機不用錢（公開 repo 用 GitHub 標準 macOS runner 不計費）。
- **不想付年費的替代做法已經在線上**：iPhone 使用者直接用網站，提醒用「加到行事曆」（.ics）。差別是沒有 app 內的本機通知。

## 還沒做的事（付費之後才需要）

依序：

1. **註冊 Apple Developer Program**：在 iPhone 的 Apple Developer app 裡完成，需要開雙重認證的 Apple 帳號與身分證件。個人帳號上架後，賣家名稱顯示本名。台灣的新台幣價格以註冊畫面為準（App Store 頁面列 NT$3,390，未驗證）。
2. **把 `ios/` 提交進 repo**：現在每次由 `npx cap add ios` 重新產生，所以沒有 app 圖示、啟動畫面，也改不了 `Info.plist`。要上架就得提交進來並補這些。
3. **針對 iOS 調整行為**（目前只證明建得起來，沒有逐項測過）：
   - iPhone 沒有返回鍵：`useBackHandler` 接的面板與多步驟流程，要確認畫面上都有關閉或上一步的按鈕。
   - 待發通知的數量：iOS 對每個 app 的待發本機通知有上限（常見說法是 64 則，Apple 現行文件沒讀到原文，未驗證）。`planSync` 在 iOS 上要只排最近的那一批。
   - Apple 準則 3.1.1 不准 app 內出現導向其他付款方式的按鈕或連結（美國店面以外）。iOS 版要把贊助、裝潢推廣、模板價格頁的入口藏起來。
   - 準則 4.2 要求 app 不能只是把網站包起來。好耶有本機通知、離線資料、計算機，送審說明要寫清楚這三項。
4. **簽章與上傳**：用 App Store Connect API 金鑰（Issuer ID、Key ID、`.p8` 檔，放 GitHub Secrets），在同一支 workflow 裡加 `xcodebuild archive` 與 `-exportArchive`，帶 `-allowProvisioningUpdates -authenticationKeyPath -authenticationKeyID -authenticationKeyIssuerID` 讓 Xcode 自己建憑證與描述檔。這三個參數在 Xcode 13 的版本說明裡有列；整段流程要有付費帳號才能實測，未驗證。
5. **TestFlight**：內部測試最多 100 人，build 有效 90 天；外部測試的第一個 build 要送審。裝到自己的 iPhone 走內部測試。

## 選項比較

| 做法 | 每月 0 元能跑幾次（每次 15 分鐘） | 沒有 Mac 能不能設定 |
|---|---|---|
| GitHub Actions macOS runner（公開 repo） | 不限 | 可以，已實測 |
| Codemagic 個人帳號 | 約 33 次（500 分鐘） | 可以，全程在瀏覽器（未實測） |
| Xcode Cloud | 會員含 25 小時 | 不行，第一次設定要用 Xcode |
| 租雲端 Mac（MacStadium 等） | 0 次，月租 US$109 起 | 可以，但要遠端操作 macOS |
| 在 Windows 上跑 macOS 虛擬機 | — | 違反 macOS 授權條款 |

Apple 自 2026-04-28 起要求上傳的 app 用 Xcode 26 以上建置；`macos-26` 映像預設的 Xcode 符合。

## 在 iPhone 上除錯（沒有 Mac 開不了 Safari 的網頁檢閱器）

- 在 app 內嵌 eruda（網頁版的 console），只在測試版開啟。
- Windows 上可用 ios-webkit-debug-proxy（要裝 iTunes）。
- `capacitor.config.ts` 要設 `ios.webContentsDebuggingEnabled`，iOS 16.4 以上的正式版才看得到 WebView。

## 來源

- Apple Developer Program 註冊條件與年費：https://developer.apple.com/programs/enroll/
- 上傳所需的 Xcode 版本：https://developer.apple.com/news/upcoming-requirements/
- TestFlight 人數與天數：https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- App Review Guidelines（3.1.1、4.2；頁面標示 2026-10-16 更新）：https://developer.apple.com/app-store/review/guidelines/
- GitHub 標準 runner 在公開 repo 免費：https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Codemagic 免費額度：https://docs.codemagic.io/billing/pricing/
- Xcode Cloud 第一次設定要用 Xcode：https://developer.apple.com/documentation/xcode/xcode-cloud-workflow-reference
- 加入主畫面的網頁 app 與 Web Push：https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
