/**
 * Vercel — hébergement réel des productions générées par GuardSite AI.
 *
 * Chaque génération peut être « mise en ligne » en un clic vers Vercel :
 * le HTML autonome est envoyé comme déploiement statique via l'API REST
 * (https://api.vercel.com/v13/deployments) et devient accessible sur une
 * URL publique `https://{projet}.vercel.app`.
 *
 * Stabilité de l'URL : le re-déploiement d'un même projet réutilise le même
 * nom de projet Vercel, donc la même URL de production (le domaine
 * `{projet}.vercel.app` pointe toujours sur le dernier déploiement).
 *
 * Configuration : `VERCEL_TOKEN` (jeton d'API Vercel, compte du client ou
 * de la plateforme). Sans jeton, l'erreur est explicite — jamais de faux
 * déploiement local.
 */

import { logger } from "./logger";

const API_BASE = "https://api.vercel.com";
const DEPLOY_POLL_MS = 1_500;
const DEPLOY_POLL_MAX = 8;

export type VercelDeployment = {
  /** URL publique stable (`https://{projet}.vercel.app`). */
  url: string;
  /** Nom du projet Vercel — à renvoyer au re-déploiement pour garder l'URL. */
  slug: string;
  deployedAt: string;
};

/** Erreur métier explicite du déploiement Vercel (affichée telle quelle). */
export class VercelDeployError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "VercelDeployError";
    this.code = code;
  }
}

const MISSING_TOKEN_CODE = "VERCEL_TOKEN_MISSING";

/** Slug de projet Vercel : minuscules ASCII + tirets, borné. */
export function vercelSlug(siteName: string): string {
  const base =
    siteName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 32) || "vitrine";
  return `guardsite-${base}`;
}

const randomSuffix = (): string => Math.random().toString(36).slice(2, 6);

type VercelErrorPayload = {
  error?: { code?: string; message?: string };
};

async function vercelFetch(path: string, init: RequestInit): Promise<Response> {
  const token = process.env["VERCEL_TOKEN"];
  if (!token) {
    throw new VercelDeployError(
      MISSING_TOKEN_CODE,
      "Déploiement Vercel indisponible : la variable VERCEL_TOKEN n'est pas configurée sur la plateforme.",
    );
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(20_000),
  });
}

/** Jette une erreur métier lisible à partir d'une réponse d'erreur Vercel. */
async function throwVercelError(res: Response, context: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as VercelErrorPayload | null;
  const detail = body?.error?.message ?? body?.error?.code ?? res.statusText;
  const code = body?.error?.code ?? `HTTP_${res.status}`;
  throw new VercelDeployError(
    code,
    `Échec du déploiement Vercel (${context}) : ${detail} (${res.status}).`,
  );
}

/**
 * Crée un déploiement statique Vercel (HTML autonome) et attend son
 * passage à READY. Retourne l'URL publique stable du projet.
 *
 * `existingSlug` = nom de projet Vercel d'un déploiement précédent : le
 * re-déploiement conserve alors la même URL de production.
 */
export async function deployToVercel(
  siteName: string,
  html: string,
  existingSlug?: string,
): Promise<VercelDeployment> {
  if (typeof html !== "string" || html.length < 50 || html.length > 2_000_000) {
    throw new VercelDeployError("INVALID_HTML", "Contenu HTML invalide pour la mise en ligne.");
  }
  if (!/<!doctype html>/i.test(html)) {
    throw new VercelDeployError("INVALID_HTML", "Le contenu n'est pas un document HTML autonome.");
  }

  // L'URL stable est le nom de projet : on le réutilise au re-déploiement.
  // En cas de collision de domaine (compte tiers), on réessaie avec un
  // suffixe aléatoire — le slug retourné reste celui à réutiliser ensuite.
  const projectName = existingSlug ?? vercelSlug(siteName);
  let name = projectName;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) name = `${projectName}-${randomSuffix()}`;

    let res: Response;
    try {
      res = await vercelFetch("/v13/deployments", {
        method: "POST",
        body: JSON.stringify({
          name,
          files: [{ file: "index.html", data: html }],
          target: "production",
        }),
      });
    } catch (err) {
      if (err instanceof VercelDeployError) throw err;
      throw new VercelDeployError(
        "NETWORK_ERROR",
        `Impossible de joindre l'API Vercel (${err instanceof Error ? err.message : err}).`,
      );
    }
    if (!res.ok) {
      if (res.status === 409 && !existingSlug) continue; // collision → suffixe
      await throwVercelError(res, "création du déploiement");
    }

    const deployment = (await res.json()) as { id?: string; readyState?: string; url?: string };
    if (!deployment.id) {
      throw new VercelDeployError("INVALID_RESPONSE", "Réponse Vercel incompréhensible.");
    }
    await waitForReady(deployment.id);
    return {
      url: `https://${name}.vercel.app`,
      slug: name,
      deployedAt: new Date().toISOString(),
    };
  }
  throw new VercelDeployError(
    "NAME_COLLISION",
    "Le nom de projet est utilisé par un autre compte Vercel ; réessayez dans un instant.",
  );
}

/** Attend le passage du déploiement à READY (ou ERROR explicite). */
async function waitForReady(deploymentId: string): Promise<void> {
  for (let i = 0; i < DEPLOY_POLL_MAX; i++) {
    const res = await vercelFetch(`/v13/deployments/${deploymentId}`, { method: "GET" });
    if (!res.ok) await throwVercelError(res, "suivi du déploiement");
    const state = (await res.json()) as { readyState?: string };
    if (state.readyState === "READY") return;
    if (state.readyState === "ERROR" || state.readyState === "ERRORED") {
      throw new VercelDeployError(
        "DEPLOY_FAILED",
        "Le déploiement Vercel s'est terminé en erreur côté Vercel.",
      );
    }
    await new Promise((r) => setTimeout(r, DEPLOY_POLL_MS));
  }
  logger.warn(
    `Déploiement Vercel ${deploymentId} pas encore READY après ${DEPLOY_POLL_MAX} sondages.`,
  );
}

/** `true` si un déploiement réel est possible (jeton présent). */
export function canDeployToVercel(): boolean {
  return Boolean(process.env["VERCEL_TOKEN"]);
}
