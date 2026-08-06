import { getRequestIP, getCookie, setCookie } from "@tanstack/react-start/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Limiteur de débit en mémoire (fenêtre glissante).
 * Sans auth ni base, il protège les appels au moteur IA des rafales.
 *
 * Identification : un cookie de session anonyme signé (`guardsite_sid`) est
 * émis et rappelé à chaque requête. On ne retombe sur l'IP qu'en secours
 * (client refusant les cookies). Le cookie est signé (HMAC) pour empêcher
 * toute forge d'un identifiant : chaque visiteur consomme son propre quota.
 */

const WINDOW_MS = 60_000;
const MAX_PER_IP = 5;
const MAX_GLOBAL = 60;
const MAX_CATALOG_PER_IP = 15;

/** Limites d'authentification : plus permissives (login/register/reset). */
const MAX_AUTH_PER_IP = 10;
const MAX_AUTH_GLOBAL = 100;

const SESSION_COOKIE = "guardsite_sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

const buckets = new Map<string, number[]>();

/**
 * Consomme un ticket pour `key`. Retourne `false` si le quota
 * de la fenêtre glissante est atteint. Fonction pure (testable).
 */
export function consume(key: string, max: number, windowMs: number = WINDOW_MS): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const entries = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (entries.length >= max) return false;
  entries.push(now);
  buckets.set(key, entries);
  return true;
}

export function _resetRateLimitsForTests(): void {
  buckets.clear();
}

/**
 * Clé de signature du cookie de session. En production, positionner
 * RATE_LIMIT_SECRET. Sinon un secret jetable est dérivé de la clé IA
 * (XAI_API_KEY ou GEMINI_API_KEY) ; en dernier recours (dev sans clé), un
 * secret aléatoire est généré au premier appel du process — les sessions ne
 * survivent pas à un restart, ce qui est acceptable hors production.
 *
 * Limites connues (MVP) :
 * - Les buckets vivent en mémoire d'isolate : en production (Vercel,
 *   plusieurs fonctions serverless), chaque instance a son propre quota — le
 *   verrou "global" n'est pas réellement partagé. Sans base ni KV, c'est
 *   accepté comme garde-fou anti-rafales, pas comme limite stricte.
 */
let _randomFallbackSecret: string | null = null;

function randomFallbackSecret(): string {
  if (!_randomFallbackSecret) _randomFallbackSecret = randomBytes(32).toString("hex");
  return _randomFallbackSecret;
}

function sessionSecret(): string {
  const secret =
    process.env["RATE_LIMIT_SECRET"] ??
    process.env["XAI_API_KEY"] ??
    process.env["GEMINI_API_KEY"] ??
    randomFallbackSecret();
  return createHmac("sha256", "GuardSite AI").update(secret).digest("hex");
}

/** Identifiant de session : `<token>.<signature>` (forge = rejeté). */
function issueSessionId(): string {
  const token = randomBytes(16).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(token).digest("hex");
  return `${token}.${signature}`;
}

/** Valide un identifiant de session (signature HMAC). Forge = rejeté. */
export function isValidSessionId(id: string | undefined): id is string {
  if (!id) return false;
  const dot = id.lastIndexOf(".");
  if (dot <= 0) return false;
  const token = id.slice(0, dot);
  const signature = id.slice(dot + 1);
  const expected = createHmac("sha256", sessionSecret()).update(token).digest();
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Retourne un identifiant stable par visiteur, en créant le cookie si absent. */
function sessionKey(): string {
  const existing = getCookie(SESSION_COOKIE);
  if (existing && isValidSessionId(existing)) return existing;
  const id = issueSessionId();
  setCookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return id;
}

/** Garde-fou appelé avant chaque génération. */
export function assertGenerationAllowed(): void {
  const session = sessionKey();
  const ip = getRequestIP() ?? "anonymous";
  // Deux verrous : un par session (résiste au changement d'IP/mobile),
  // et un par IP (résiste à l'effacement des cookies).
  if (!consume(`generate:session:${session}`, MAX_PER_IP)) {
    throw new Response("Trop de générations pour l'instant. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume(`generate:ip:${ip}`, MAX_PER_IP)) {
    throw new Response("Trop de générations pour l'instant. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume("generate:global", MAX_GLOBAL)) {
    throw new Response("Charge temporairement trop élevée. Réessayez dans une minute.", {
      status: 429,
    });
  }
}

/** Garde-fou appelé avant chaque demande au catalogue (plus permissif, appel local). */
export function assertCatalogAllowed(): void {
  const session = sessionKey();
  const ip = getRequestIP() ?? "anonymous";
  if (!consume(`catalog:session:${session}`, MAX_CATALOG_PER_IP)) {
    throw new Response("Trop de demandes au catalogue. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume(`catalog:ip:${ip}`, MAX_CATALOG_PER_IP)) {
    throw new Response("Trop de demandes au catalogue. Réessayez dans une minute.", {
      status: 429,
    });
  }
}

/** Garde-fou appelé avant chaque mise en ligne (export/deploy). */
export function assertDeployAllowed(): void {
  const session = sessionKey();
  const ip = getRequestIP() ?? "anonymous";
  if (!consume(`deploy:session:${session}`, MAX_PER_IP)) {
    throw new Response("Trop de mises en ligne pour l'instant. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume(`deploy:ip:${ip}`, MAX_PER_IP)) {
    throw new Response("Trop de mises en ligne pour l'instant. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume("deploy:global", MAX_GLOBAL)) {
    throw new Response("Charge temporairement trop élevée. Réessayez dans une minute.", {
      status: 429,
    });
  }
}

/** Garde-fou appelé avant chaque appel d'authentification. */
export function assertAuthAllowed(): void {
  const session = sessionKey();
  const ip = getRequestIP() ?? "anonymous";
  if (!consume(`auth:session:${session}`, MAX_AUTH_PER_IP)) {
    throw new Response("Trop de demandes d'authentification. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume(`auth:ip:${ip}`, MAX_AUTH_PER_IP)) {
    throw new Response("Trop de demandes d'authentification. Réessayez dans une minute.", {
      status: 429,
    });
  }
  if (!consume("auth:global", MAX_AUTH_GLOBAL)) {
    throw new Response("Charge temporairement trop élevée. Réessayez dans une minute.", {
      status: 429,
    });
  }
}
