@echo off
echo ===== DEPLOYING CHANGES TO GITHUB =====

rem Add all changes
git add .

rem Get commit message or use default
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG="Update application"

rem Commit with message
git commit -m %COMMIT_MSG%

rem Push to main branch
git push origin main

echo ===== DEPLOYMENT COMPLETE =====
pause
