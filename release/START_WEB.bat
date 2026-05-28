@echo off
setlocal

set "BACKEND_DIR=D:\Nguyen_The_Dat\BCTT\06_Do_an_tot_nghiep\app\backend"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo Kiem tra PostgreSQL service...
sc query postgresql-x64-17 | findstr /I "RUNNING" >nul
if errorlevel 1 (
  echo PostgreSQL chua chay. Hay mo Services va start postgresql-x64-17
  echo Hoac chay Command Prompt bang quyen Administrator roi dung:
  echo net start postgresql-x64-17
  pause
  exit /b 1
)

echo Mo ban web tai http://localhost:5000
start "" "http://localhost:5000"

cd /d "%BACKEND_DIR%"
"C:\Program Files\nodejs\node.exe" src/server.js
