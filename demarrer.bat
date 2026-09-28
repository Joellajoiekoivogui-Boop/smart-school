@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Agent commercial IA - WhatsApp

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe sur cet ordinateur.
  echo Installez la version LTS depuis https://nodejs.org puis relancez ce fichier.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installation des composants, patientez quelques minutes...
  call npm install
  if errorlevel 1 (
    echo L'installation a echoue. Verifiez votre connexion internet puis relancez.
    pause
    exit /b 1
  )
)

node scripts\start-local.js
pause
