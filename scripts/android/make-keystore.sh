#!/usr/bin/env bash
# 產生 Google Play 上傳金鑰（upload key）與 android/keystore.properties。整個專案只需要跑一次。
#
# Windows 請在 Git Bash 執行。需要 JDK 的 keytool 在 PATH 上（Android Studio 附的 JBR 也可以：
#   export PATH="/c/Program Files/Android/Android Studio/jbr/bin:$PATH"）。
#
# 為什麼密碼不直接寫在 keytool 參數：-storepass xxx 會留在 shell history 和 ps 輸出；
# 改用 -storepass:env 讓 keytool 從環境變數讀。
set -euo pipefail
cd "$(dirname "$0")/../.."

KEYSTORE=android/upload-keystore.jks
PROPS=android/keystore.properties
ALIAS=upload

if ! command -v keytool >/dev/null 2>&1; then
  echo "找不到 keytool。請確認 JDK 已安裝且在 PATH 上。" >&2
  exit 1
fi
for f in "$KEYSTORE" "$PROPS"; do
  if [ -e "$f" ]; then
    echo "$f 已存在，不覆寫。上架後金鑰不能換，真的要重做請先備份再自行刪除。" >&2
    exit 1
  fi
done

echo "將建立 $KEYSTORE（alias=$ALIAS、RSA 2048、效期 10000 天）"
read -rsp "Keystore 密碼（至少 6 碼，不要用反斜線）: " PASS1; echo
read -rsp "再輸入一次確認: " PASS2; echo
if [ "$PASS1" != "$PASS2" ]; then echo "兩次密碼不一致。" >&2; exit 1; fi
if [ "${#PASS1}" -lt 6 ]; then echo "密碼至少 6 碼。" >&2; exit 1; fi
case "$PASS1" in
  *\\*) echo "密碼不能含反斜線（keystore.properties 會解析錯誤）。" >&2; exit 1 ;;
esac
read -rp "憑證名稱 CN（公司或個人名，Enter 用預設 HaoSuan HaoTi）: " CN
CN="${CN:-HaoSuan HaoTi}"

# PKCS12 keystore 的 key 密碼必須和 store 密碼相同，所以兩邊都用同一個
KS_PASS="$PASS1" keytool -genkeypair -v \
  -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass:env KS_PASS -keypass:env KS_PASS \
  -dname "CN=$CN, O=HaoSuan, C=TW"

umask 077
cat > "$PROPS" <<EOF
storeFile=upload-keystore.jks
storePassword=$PASS1
keyAlias=$ALIAS
keyPassword=$PASS1
EOF

echo
echo "完成："
echo "  $KEYSTORE"
echo "  $PROPS"
echo
echo "請立刻把這兩個檔案備份到密碼管理器（1Password / Bitwarden 等）；遺失就不能更新 app。"
echo "兩個檔案都在 .gitignore 裡，不會被 commit。"
echo "CI 要用的話把 keystore 轉成 base64 放進 secret ANDROID_KEYSTORE_BASE64："
echo "  base64 -w0 $KEYSTORE   （macOS: base64 -i $KEYSTORE）"
