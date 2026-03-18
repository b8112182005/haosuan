# 好算 APP 發布流程

## 一套代碼，同步更新

- **Web 版**：push 到 main → Railway 自動部署
- **APP 版**：打 tag → GitHub Actions 自動建置 APK/IPA

## 發布 APP 新版本

```bash
# 確保 main 是最新的
git checkout main
git pull

# 打版本 tag（觸發 APP 建置）
git tag v1.0.0
git push origin v1.0.0
```

## 本地建置（開發用）

### Android
```bash
npm run build:app    # 建置 Next.js 靜態版本
npx cap sync android # 同步到 Android 專案
npx cap open android # 用 Android Studio 開啟
```

### iOS（需要 Mac + Xcode）
```bash
npm run build:app
npx cap sync ios
npx cap open ios
```

## 環境需求

| 平台 | 工具 | 版本 |
|------|------|------|
| Android | Android Studio | Hedgehog+ |
| Android | JDK | 17 |
| iOS | macOS | Ventura+ |
| iOS | Xcode | 15+ |
| iOS | Apple Developer | NT$3,000/年 |

## 注意事項

- Web build 和 APP build 使用同一份 source code
- 計算邏輯（src/lib/calculators/）100% 共用，零改動
- APP build 用 `BUILD_TARGET=app` 環境變數觸發 static export
- iOS build 需要 Mac，Windows 上只能建置 Android
