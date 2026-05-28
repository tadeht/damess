@echo off
setlocal

set "BACKEND_DIR=D:\Nguyen_The_Dat\BCTT\06_Do_an_tot_nghiep\app\backend"
set "APP_EXE=%~dp0desktop-app\Damess.exe"
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

echo Khoi dong backend trong cua so rieng...
start "Backend API" cmd /k "cd /d %BACKEND_DIR% && "C:\Program Files\nodejs\node.exe" src/server.js"

timeout /t 3 /nobreak >nul
echo Mo ung dung desktop...
start "" "%APP_EXE%"
