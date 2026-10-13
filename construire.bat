@echo off
rem Reconstruit le site U-IMCEC apres une modification, le controle, puis le recopie
rem dans le dossier parent (celui qui contient index.html).
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
echo Construction, controle et publication du site...
call npm run tout
if errorlevel 1 (
  echo.
  echo La construction a echoue : le site publie n'a pas ete modifie. Consultez les messages ci-dessus.
  pause
  exit /b 1
)
echo.
echo Termine. Ouvrez index.html dans le dossier parent pour voir le resultat.
pause
