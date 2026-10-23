@echo off
cd /d "%~dp0"
echo ===================================================
echo   Shokimitsu2 - GitHub Push ^& Auto Deploy
echo ===================================================
echo.
git add -A
git status -s
git diff --cached --quiet
if %errorlevel% neq 0 (
  git commit -m "Update Shokimitsu2"
)
echo.
echo Pushing to GitHub (origin/main)...
git push -u origin main
echo.
if %errorlevel% equ 0 (
  echo [OK] Push completed successfully!
) else (
  echo [ERROR] Push failed. Please check the message above.
)
echo ===================================================
pause
