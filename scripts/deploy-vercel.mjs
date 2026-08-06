#!/usr/bin/env node
/**
 * GuardSite AI — déploiement Vercel en une commande.
 *
 * Chaîne complète, avec les clés du `.env` chargées :
 *   1. build de production (cible Vercel) ;
 *   2. synchronisation des clés IA / VERCEL_TOKEN vers le projet Vercel
 *      (sinon aucune IA ne tourne sur le déploiement) ;
 *   3. `nitro deploy --prebuilt` (déploiement réel chez Vercel).
 *
 * Usage : npm run vercel:deploy
 * Prérequis : GEMINI_API_KEY (+ VERCEL_TOKEN) renseignés dans `.env`.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, ".env");

function loadEnvFile() {
  if (!existsSync(ENV_FILE)) return;
  for (const raw of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

function run(command, label) {
  console.log(`\n=== ${label} ===`);
  const res = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

loadEnvFile();
run("npm run build", "Build de production (cible Vercel)");
run("node scripts/sync-vercel-env.mjs", "Synchronisation des clés vers le projet Vercel");
run("npm run deploy", "Déploiement Vercel (nitro deploy --prebuilt)");

console.log("\n=== Déploiement terminé : l'IA (Gemini) est active sur Vercel ===");
