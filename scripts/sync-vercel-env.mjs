#!/usr/bin/env node
/**
 * GuardSite AI — synchronisation des variables d'environnement du `.env`
 * local vers le projet Vercel (clés IA, VERCEL_TOKEN, rate-limit…).
 *
 * Sans cette étape, un déploiement Vercel ne possède aucune clé : le moteur
 * IA retombe sur son fallback déterministe (aucune génération IA réelle).
 * Les variables sont injectées côté projet Vercel, chiffrées
 * (`type: "encrypted"`), pour production, preview et développement.
 *
 * Usage :
 *   node scripts/sync-vercel-env.mjs            # synchronise .env -> projet Vercel
 *   node scripts/sync-vercel-env.mjs --dry-run  # prévisualise sans rien écrire
 *   node scripts/sync-vercel-env.mjs --project=<nom|id>
 *
 * Le projet cible : `--project=<nom|id>`, sinon `VERCEL_PROJECT`, sinon le
 * nom du package (créé automatiquement s'il n'existe pas encore).
 *
 * ⚠ Une modification d'environnement n'est appliquée qu'au prochain
 *   déploiement — lancez ensuite `npm run vercel:deploy`.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, ".env");
const PACKAGE = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const API_BASE = "https://api.vercel.com";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const projectArg = args.find((a) => a.startsWith("--project="))?.split("=")[1];

/** Parse les paires KEY=VALUE du fichier .env (commentaires, quotes ignorées). */
function parseEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const raw of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[match[1]] = value;
  }
  return out;
}

async function api(token, path, init) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function errorDetail(res) {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? res.statusText;
}

/** Projet Vercel cible : existe déjà, ou créé au nom du package. */
async function resolveProject(token, env) {
  const candidates = [projectArg, process.env.VERCEL_PROJECT, PACKAGE.name].filter((c) =>
    Boolean(c),
  );
  for (const cand of candidates) {
    const res = await api(token, `/v9/projects/${encodeURIComponent(cand)}`);
    if (res.ok) {
      const project = await res.json();
      return project;
    }
  }
  const fallbackName = PACKAGE.name;
  if (projectArg || process.env.VERCEL_PROJECT) {
    throw new Error(`Projet Vercel introuvable : ${candidates.join(", ")}`);
  }
  const res = await api(token, "/v10/projects", {
    method: "POST",
    body: JSON.stringify({ name: fallbackName }),
  });
  if (!res.ok) {
    throw new Error(`Création du projet Vercel impossible : ${await errorDetail(res)}`);
  }
  const project = await res.json();
  console.log(`✓ Projet Vercel créé : ${project.name}`);
  return project;
}

/** Crée ou met à jour (upsert) une variable d'environnement sur tous les environnements. */
async function upsertEnv(token, projectId, key, value) {
  const res = await api(token, `/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: ["production", "preview", "development"],
    }),
  });
  if (!res.ok) {
    throw new Error(`Variable ${key} : ${await errorDetail(res)}`);
  }
  const body = await res.json();
  return Array.isArray(body.updated) && body.updated.length > 0 ? "updated" : "created";
}

async function main() {
  const env = parseEnvFile();
  const keys = Object.keys(env).sort();
  if (keys.length === 0) {
    console.error(`Aucune variable non vide dans ${ENV_FILE}.`);
    process.exit(1);
  }

  const target = projectArg ?? process.env.VERCEL_PROJECT ?? PACKAGE.name;
  console.log(
    `Cible : projet Vercel « ${target} » (${dryRun ? "dry-run, aucune écriture" : "écriture réelle"})`,
  );
  console.log(`Variables à synchroniser (${keys.length}) :`);
  for (const key of keys) {
    console.log(`  - ${key} (${env[key].length} caractères, valeur masquée)`);
  }

  const token = env.VERCEL_TOKEN ?? process.env.VERCEL_TOKEN;
  if (dryRun) {
    console.log(
      `\nDry-run terminé : aucune modification effectuée (${Object.keys(env).length} variables prêtes).`,
    );
    return;
  }
  if (!token) {
    console.error(
      "\nERREUR : aucune variable VERCEL_TOKEN dans .env — le jeton est requis pour piloter l'API Vercel.\n" +
        "Ajoutez VERCEL_TOKEN=<jeton> dans votre .env (https://vercel.com/account/tokens).",
    );
    process.exit(1);
  }

  const project = await resolveProject(token, env);
  let created = 0;
  let updated = 0;
  for (const key of keys) {
    try {
      const status = await upsertEnv(token, project.id, key, env[key]);
      if (status === "created") created += 1;
      else updated += 1;
      console.log(`✓ ${key} ${status === "created" ? "créée" : "mise à jour"} sur ${project.name}`);
    } catch (err) {
      console.error(`✗ ${key} : ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }

  console.log(
    `\nTerminé : ${created} créée(s), ${updated} mise(s) à jour sur ${project.name}.` +
      `\nLes changements s'appliquent au PROCHAIN déploiement — lancez : npm run vercel:deploy`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
