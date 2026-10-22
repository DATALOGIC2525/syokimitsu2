@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ===================================================
echo   ショキミツ2 - GitHub ＆ Vercel 自動更新スクリプト
echo ===================================================
echo.

git add -A
git status -s

set /p MSG="変更内容のメモを入力してください（空欄のままEnterで自動日時）: "
if "%MSG%"=="" set MSG=Update %date% %time%

git commit -m "%MSG%"
echo.
echo GitHubへプッシュしています...
git push -u origin main

echo.
echo ===================================================
echo   完了しました！約1分で本番環境へ自動反映されます。
echo ===================================================
pause
