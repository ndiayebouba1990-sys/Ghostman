@echo off
rem Apercu du site U-IMCEC << comme en ligne >> : construit le site puis le sert sur
rem http://localhost:8080 (vrais cookies, formulaire simule). Pour un simple coup d'oeil,
rem il suffit de double-cliquer sur index.html dans le dossier parent.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est necessaire : installez-le depuis https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Premiere utilisation : installation des outils, merci de patienter...
  call npm install
)
echo Construction du site...
call npm run build
if errorlevel 1 (
  echo La construction a echoue. Consultez les messages ci-dessus.
  pause
  exit /b 1
)
start "" http://localhost:8080
echo Site disponible sur http://localhost:8080 - fermez cette fenetre pour arreter.
call npm run apercu
