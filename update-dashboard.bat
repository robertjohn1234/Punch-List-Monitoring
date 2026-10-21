@echo off
setlocal
cd /d "%~dp0"

echo.
echo ===== PUNCH LIST - ONE CLICK UPDATE =====
echo Reminder: save and close the Excel file first.
echo.

echo [1/3] Converting Excel to dashboard data...
call npm run generate-data
if errorlevel 1 goto error

echo.
echo [2/3] Checking for changes...
git add punchlist-data.json punchlist-history.json
if errorlevel 1 goto error
git diff --cached --quiet
if not errorlevel 1 (
    echo No changes to push.
    goto success
)

echo.
echo [3/3] Committing and pushing...
git commit -m "Update punch list"
if errorlevel 1 goto error
git push
if errorlevel 1 goto error

:success
echo.
echo Update completed. Render will redeploy in a minute or two.
pause
exit /b 0

:error
echo.
echo UPDATE FAILED. Check the messages above.
pause
exit /b 1
