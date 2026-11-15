#!/usr/bin/env bash
# 本機出 release AAB：Next.js 靜態輸出 → cap sync → gradle bundleRelease
#
# 用法：scripts/android/build-release.sh <versionCode> [versionName]
#   versionCode  每次上傳 Play 都要比上一次大的整數（Play Console → 版本 → 看上一版的版本代碼）
#   versionName  選填，沒給就用 package.json 的 version
#
# 簽章：需要 android/keystore.properties（scripts/android/make-keystore.sh 產生）或 ANDROID_KEYSTORE_* 環境變數，
# 兩者都沒有時 gradle 會退回 debug 簽章——能裝來測，但上傳 Play 會被拒。
set -euo pipefail
cd "$(dirname "$0")/../.."

VERSION_CODE="${1:-}"
VERSION_NAME="${2:-}"
if [ -z "$VERSION_CODE" ] || ! [[ "$VERSION_CODE" =~ ^[0-9]+$ ]]; then
  echo "用法: $0 <versionCode> [versionName]" >&2
  echo "versionCode 必須是整數，且比上一次上傳 Play 的大。" >&2
  exit 1
fi

if [ ! -f android/keystore.properties ] && [ -z "${ANDROID_KEYSTORE_PATH:-}" ]; then
  echo "警告：沒有 android/keystore.properties 也沒有 ANDROID_KEYSTORE_PATH，這次會用 debug 簽章（不能上傳 Play）。" >&2
fi

npm run build:app
npx cap sync android

cd android
GRADLE_ARGS=(bundleRelease "-PversionCode=$VERSION_CODE")
if [ -n "$VERSION_NAME" ]; then
  GRADLE_ARGS+=("-PversionName=$VERSION_NAME")
fi
./gradlew "${GRADLE_ARGS[@]}"

AAB=app/build/outputs/bundle/release/app-release.aab
echo
echo "AAB: $(pwd)/$AAB ($(du -h "$AAB" | cut -f1))"
echo "versionCode=$VERSION_CODE${VERSION_NAME:+ versionName=$VERSION_NAME}"
