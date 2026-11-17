@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo   NEON ATLAS — квиз «страна и столица»
echo   ------------------------------------
echo.

set "PHP="
if exist "%~dp0php\php.exe" set "PHP=%~dp0php\php.exe"

if not defined PHP (
    for /f "delims=" %%i in ('where php 2^>nul') do (
        if not defined PHP set "PHP=%%i"
    )
)

if not defined PHP (
    echo   PHP не найден.
    echo.
    echo   Вариант 1. Скачайте портативный PHP для Windows:
    echo     https://windows.php.net/downloads/releases/
    echo     Нужна сборка "VS16 x64 Non Thread Safe", файл php-8.x-nts-Win32-vs16-x64.zip
    echo     Распакуйте архив в папку "php" рядом с этим файлом,
    echo     чтобы получилось: %~dp0php\php.exe
    echo.
    echo   Вариант 2. Установите PHP через winget:
    echo     winget install PHP.PHP
    echo.
    pause
    exit /b 1
)

echo   PHP: !PHP!
echo   Адрес: http://127.0.0.1:8080/
echo.
echo   Не закрывайте это окно, пока играете.
echo   Остановить сервер: Ctrl+C
echo.

start "" "http://127.0.0.1:8080/"
"!PHP!" -S 127.0.0.1:8080 -t "%~dp0"

echo.
echo   Сервер остановлен.
pause
