import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Site 100 % statique (dossier `out/`) : les données vivent dans le
  // navigateur, aucune fonction serveur n'est nécessaire.
  output: 'export',
  // Compile aussi la bibliothèque d'animation pour les anciens navigateurs
  // (cibles définies dans « browserslist » du package.json).
  transpilePackages: ['motion', 'framer-motion', 'motion-dom', 'motion-utils'],
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
