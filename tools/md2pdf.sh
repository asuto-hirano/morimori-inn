#!/bin/bash
# Markdownの表をA4横向きのPDFにする（macOS標準のPython3 + Chromeだけで動きます）
# 使い方: bash tools/md2pdf.sh 確認事項一覧.md
set -e
SRC="${1:?変換したい.mdファイルを指定してください}"
BASE="${SRC%.md}"
TMP="$(mktemp -d)"
python3 "$(dirname "$0")/md2html.py" "$SRC" "$TMP/out.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --virtual-time-budget=4000 \
  --print-to-pdf="$PWD/$BASE.pdf" "file://$TMP/out.html" 2>&1 | grep "bytes written"
rm -rf "$TMP"
echo "生成しました: $BASE.pdf"
