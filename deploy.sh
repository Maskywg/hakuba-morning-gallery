#!/usr/bin/env bash
set -e

REPO_NAME="hakuba-morning-gallery"
GH_USER="Maskywg"

echo "=== 正在初始化 Git 儲存庫 ($GH_USER/$REPO_NAME) ==="
git init
git add index.html images/ README.md hakuba_morning_standalone.html
git commit -m "Initial commit: Hakuba morning photography gallery (2025-11-02)" || true
git branch -M main

if command -v gh &> /dev/null; then
    echo "=== 偵測到 GitHub CLI (gh)，正在自動建立公開儲存庫並推送 ==="
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push || git push -u origin main
    echo "=== 正在啟用 GitHub Pages ==="
    gh api -X POST "repos/$GH_USER/$REPO_NAME/pages" -f "source[branch]=main" -f "source[path]=/" || true
    echo "✅ 部署完成！網址：https://maskywg.github.io/$REPO_NAME/"
else
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
    echo "=== 正在推送至 https://github.com/$GH_USER/$REPO_NAME.git ==="
    git push -u origin main
    echo "✅ 推送完成！請至 https://github.com/$GH_USER/$REPO_NAME/settings/pages 將 Branch 設為 main / (root) 即可上線。"
    echo "🌐 上線網址：https://maskywg.github.io/$REPO_NAME/"
fi
