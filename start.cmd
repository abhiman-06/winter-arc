@echo off
REM Winter Arc — runs the site locally and opens it in your browser.
REM Double-click this file. Needs Node OR Python (most PCs have one).

cd /d "%~dp0"
echo.
echo   Winter Arc  -  starting local server...
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:4173
  npx --yes http-server . -p 4173 -c-1 --silent
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:4173
  python -m http.server 4173
  goto :eof
)

echo   Neither Node nor Python was found.
echo   No problem - just open  dist\winter-arc.html  by double-clicking it.
echo.
pause
