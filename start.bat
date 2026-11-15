@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Elso inditas: csomagok telepitese ^(npm install^)...
  call npm install || (echo Az npm install nem sikerult. Telepitve van a Node.js 20.19+? & pause & exit /b 1)
)
call npm run dev
