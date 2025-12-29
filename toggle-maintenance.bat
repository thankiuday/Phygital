@echo off
REM Phygital Zone - Maintenance Mode Toggle Script (Windows)
REM Usage: toggle-maintenance.bat [on|off|status]

setlocal enabledelayedexpansion

set CONFIG_FILE=frontend\src\config\maintenance.js

REM Display header
echo.
echo ==========================================
echo    Phygital Zone Maintenance Toggle
echo ==========================================
echo.

REM Check if config file exists
if not exist "%CONFIG_FILE%" (
    echo ERROR: Config file not found at %CONFIG_FILE%
    exit /b 1
)

REM Parse command
if "%1"=="on" goto enable
if "%1"=="enable" goto enable
if "%1"=="off" goto disable
if "%1"=="disable" goto disable
if "%1"=="status" goto status
goto usage

:enable
echo Enabling maintenance mode...
copy "%CONFIG_FILE%" "%CONFIG_FILE%.backup" >nul
powershell -Command "(gc '%CONFIG_FILE%') -replace 'ENABLED: false', 'ENABLED: true' | Out-File -encoding UTF8 '%CONFIG_FILE%'"
findstr /C:"ENABLED: true" "%CONFIG_FILE%" >nul
if %errorlevel%==0 (
    echo SUCCESS: Maintenance mode ENABLED!
    echo.
    echo Don't forget to rebuild and restart your application:
    echo   cd frontend ^&^& npm run build
    echo   pm2 restart phygital-app
) else (
    echo ERROR: Failed to enable maintenance mode
    copy "%CONFIG_FILE%.backup" "%CONFIG_FILE%" >nul
)
goto cleanup

:disable
echo Disabling maintenance mode...
copy "%CONFIG_FILE%" "%CONFIG_FILE%.backup" >nul
powershell -Command "(gc '%CONFIG_FILE%') -replace 'ENABLED: true', 'ENABLED: false' | Out-File -encoding UTF8 '%CONFIG_FILE%'"
findstr /C:"ENABLED: false" "%CONFIG_FILE%" >nul
if %errorlevel%==0 (
    echo SUCCESS: Maintenance mode DISABLED!
    echo.
    echo Don't forget to rebuild and restart your application:
    echo   cd frontend ^&^& npm run build
    echo   pm2 restart phygital-app
) else (
    echo ERROR: Failed to disable maintenance mode
    copy "%CONFIG_FILE%.backup" "%CONFIG_FILE%" >nul
)
goto cleanup

:status
findstr /C:"ENABLED: true" "%CONFIG_FILE%" >nul
if %errorlevel%==0 (
    echo STATUS: Maintenance Mode is ENABLED
) else (
    echo STATUS: Maintenance Mode is DISABLED
)
goto cleanup

:usage
echo Usage: %0 [on^|off^|status]
echo.
echo Commands:
echo   on      - Enable maintenance mode
echo   off     - Disable maintenance mode
echo   status  - Check current maintenance mode status
echo.
echo Examples:
echo   %0 on      # Enable maintenance mode
echo   %0 off     # Disable maintenance mode
echo   %0 status  # Check status
echo.
echo Current status:
findstr /C:"ENABLED: true" "%CONFIG_FILE%" >nul
if %errorlevel%==0 (
    echo Maintenance Mode: ENABLED
) else (
    echo Maintenance Mode: DISABLED
)
goto cleanup

:cleanup
if exist "%CONFIG_FILE%.backup" del "%CONFIG_FILE%.backup"
echo.
endlocal


























