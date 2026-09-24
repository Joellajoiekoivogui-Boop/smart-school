/**
 * Écrit public/sw.js en y injectant un numéro de version unique à chaque
 * build : le navigateur installe alors la nouvelle version et purge l'ancien
 * cache. Lancé automatiquement avant `next build` (script "prebuild").
 */
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || Date.now().toString(36);
const template = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8');
writeFileSync(new URL('../public/sw.js', import.meta.url), template.replace('__VERSION__', version));
console.log(`public/sw.js généré (version ${version})`);
