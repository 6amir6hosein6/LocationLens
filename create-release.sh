#!/bin/bash
# create-release.sh - Run this locally to create a GitHub Release with APK/AAB
#
# Prerequisites:
#   1. Create a GitHub Personal Access Token (classic) with "repo" scope:
#      https://github.com/settings/tokens
#   2. Set it as an environment variable: export GH_TOKEN=ghp_xxxxxxxx
#
# Usage:
#   chmod +x create-release.sh
#   GH_TOKEN=your_token ./create-release.sh

set -e

REPO="6amir6hosein6/LocationLens"
TAG="v1.0.0-persian"
NAME="LocationLens Persian RTL Release"
BODY="$(cat <<'EOF'
## تغییرات فارسی‌سازی

### UI
- تمام متون اپلیکیشن به فارسی ترجمه شد
- حالت RTL فعال شد
- فونت Vazirmatn اضافه شد
- اعداد نمایشی به فارسی تبدیل شدند
- تاریخ‌ها به تقویم فارسی تغییر کردند

### بسته‌های سکه
| بسته | سکه | قیمت |
|---|---|---|
| برنزی | ۱۰ | ۳۵۰,۰۰۰ ریال |
| نقره‌ای | ۲۰ | ۵۵۰,۰۰۰ ریال |
| طلایی | ۵۰ | ۱,۲۵۰,۰۰۰ ریال |

### آیکون و لوگو
- لوگو جدید در وب و اندروید
- اسپلش اسکرین سفید با لوگو مرکزی

### جهت کشیدن کارت (Swipe)
- چپ = کشف (RTL)
- راست = رد
EOF
)"

APK_PATH="LocationLens-release.apk"
AAB_PATH="LocationLens-release.aab"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Error: GH_TOKEN environment variable is not set."
  echo "   Create a token at: https://github.com/settings/tokens"
  echo "   Required scopes: repo (or public_repo for public repos)"
  echo ""
  echo "   Example: GH_TOKEN=ghp_xxxxxxx ./create-release.sh"
  exit 1
fi

echo "Creating release ${TAG}..."

# 1. Create the release
RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/releases" \
  -d @- <<EOF
{
  "tag_name": "${TAG}",
  "name": "${NAME}",
  "body": ${BODY@Q},
  "draft": false,
  "prerelease": false
}
EOF
)

UPLOAD_URL=$(echo "$RELEASE_RESPONSE" | grep '"upload_url"' | sed 's/.*"upload_url": "\([^"]*\){?name,label}".*/\1/')

if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" = "null" ]; then
  echo "❌ Failed to create release. Response:"
  echo "$RELEASE_RESPONSE"
  exit 1
fi

echo "✅ Release created successfully!"
echo ""

# 2. Upload APK
echo "Uploading APK..."
curl -s -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Content-Type: application/vnd.android.package-archive" \
  "${UPLOAD_URL}?name=${APK_PATH}" \
  --data-binary "@${APK_PATH}"
echo "✅ APK uploaded"

# 3. Upload AAB
echo "Uploading AAB..."
curl -s -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "${UPLOAD_URL}?name=${AAB_PATH}" \
  --data-binary "@${AAB_PATH}"
echo "✅ AAB uploaded"

echo ""
echo "🎉 Release published: https://github.com/${REPO}/releases/tag/${TAG}"
