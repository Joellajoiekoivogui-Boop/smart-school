#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé. Installez la version LTS depuis https://nodejs.org puis relancez ./demarrer.sh"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installation des composants, patientez quelques minutes..."
  npm install || { echo "L'installation a échoué. Vérifiez votre connexion internet puis relancez."; exit 1; }
fi

exec node scripts/start-local.js
