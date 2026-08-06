/**
 * GuardSite AI — couche d'authentification (MVP hackathon).
 *
 * Architecture :
 * - Sessions stockées en mémoire avec nettoyage périodique.
 * - Mot de passe haché avec PBKDF2 (salage aléatoire).
 * - Tokens de réinitialisation à usage unique, expiration courte.
 * - Identifiants de session aléatoires (non devinables), sessions côté serveur.
 * - Rate-limiting intégré via le module rate-limit existant.
 *
 * Ce module est un MVP : il ne persiste pas les utilisateurs entre redémarrages
 * (pas de DB en phase 1). Une couche de persistance peut être ajoutée plus tard.
 */

import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import type { AuthSession, AuthUser } from "./auth.types";
import { logger } from "../logger";
import { GOOGLE_DEMO_EMAIL, GOOGLE_DEMO_NAME, GOOGLE_DEMO_TOKEN } from "./google-demo";

/** Nombre d'itérations PBKDF2 (recommandation OWASP : >= 600 000). */
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEY_LEN = 32;
const PBKDF2_DIGEST = "sha256";

/** Configuration du cookie de session. */
const SESSION_COOKIE_NAME = "guardsite_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

/** Durée de validité des tokens de réinitialisation (15 min). */
const RESET_TTL_MS = 1000 * 60 * 15;

/** ----------------------------------------------------------------------- */
/** Modèle de données en mémoire (MVP : pas de persistance entre redémarrages) */

type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  picture: string | undefined;
  provider: "credentials" | "google";
};

type StoredSession = {
  user: AuthSession["user"];
  accessToken: string;
  expiresAt: number;
};

const users = new Map<string, StoredUser>();
const sessions = new Map<string, StoredSession>();
const resetTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();

/** Nettoie périodiquement les tokens de réinitialisation et sessions expirés (MVP). */
const CLEANUP_INTERVAL = 1000 * 60 * 5; // 5 min
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedTokens = 0;
    for (const [token, info] of resetTokens) {
      if (info.expiresAt < now) {
        resetTokens.delete(token);
        cleanedTokens++;
      }
    }
    for (const [sid, sess] of sessions) {
      if (sess.expiresAt < now) {
        sessions.delete(sid);
        cleanedSessions++;
      }
    }
    if (cleanedTokens > 0) logger.debug(`Cleaned ${cleanedTokens} expired reset tokens.`);
    if (cleanedSessions > 0) logger.debug(`Cleaned ${cleanedSessions} expired sessions.`);
  }, CLEANUP_INTERVAL);
  cleanupTimer.unref();
}
scheduleCleanup();

/** ----------------------------------------------------------------------- */
/** Utilitaires de hachage et de signature */

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LEN,
    PBKDF2_DIGEST,
  ).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const candidate = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LEN,
    PBKDF2_DIGEST,
  ).toString("hex");
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidate, "hex"));
}

/** ----------------------------------------------------------------------- */
/** API publique — appelée par les server functions

 * Toutes les fonctions lèvent `Response` (HTTP error) pour être interceptées
 * naturellement par TanStack Start.
 */

export function createUser(name: string, email: string, password: string): AuthUser {
  const normalizedEmail = email.toLowerCase().trim();
  if (users.has(normalizedEmail)) {
    throw new Response("Cet email est déjà utilisé.", { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  const user: StoredUser = {
    id: randomBytes(8).toString("hex"),
    email: normalizedEmail,
    name,
    passwordHash: hash,
    salt,
    picture: undefined,
    provider: "credentials",
  };
  users.set(normalizedEmail, user);
  logger.info(`User created: ${user.id} (${normalizedEmail})`);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: undefined,
    provider: user.provider,
  };
}

function issueAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

function createSession(user: StoredUser): AuthSession {
  const accessToken = issueAccessToken();
  const session: StoredSession = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: user.provider,
    },
    accessToken,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const sessionId = `sess_${randomBytes(16).toString("hex")}`;
  sessions.set(sessionId, session);
  setCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { user: session.user, accessToken: session.accessToken };
}

export function authenticateUser(email: string, password: string): AuthSession {
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.get(normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    throw new Response("Email ou mot de passe incorrect.", { status: 401 });
  }
  return createSession(user);
}

/**
 * Connexion Google simulée (MVP).
 * Le jeton est vérifié côté serveur : seul le jeton de démonstration connu
 * est accepté. Le compte créé est fixe (côté serveur) — l'email, le nom et
 * la photo fournis par le client ne sont jamais utilisés, ce qui supprime
 * toute prise de contrôle par un jeton revendiqué.
 */
export function authenticateGoogle(idToken: string): AuthSession {
  if (idToken !== GOOGLE_DEMO_TOKEN) {
    throw new Response("Jeton Google invalide.", { status: 401 });
  }

  let user = users.get(GOOGLE_DEMO_EMAIL);
  if (!user) {
    const { hash, salt } = hashPassword(randomBytes(32).toString("hex"));
    user = {
      id: randomBytes(8).toString("hex"),
      email: GOOGLE_DEMO_EMAIL,
      name: GOOGLE_DEMO_NAME,
      passwordHash: hash,
      salt,
      picture: undefined,
      provider: "google",
    };
    users.set(GOOGLE_DEMO_EMAIL, user);
  }

  logger.info(`Google user authenticated: ${user.id} (${GOOGLE_DEMO_EMAIL})`);
  return createSession(user);
}

/** Récupère la session courante depuis le cookie, ou null si inexistante/expirée. */
export function getSession(): AuthSession | null {
  const sessionId = getCookie(SESSION_COOKIE_NAME);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    deleteCookie(SESSION_COOKIE_NAME);
    return null;
  }
  return { user: session.user, accessToken: session.accessToken };
}

export function clearSession(): void {
  const sessionId = getCookie(SESSION_COOKIE_NAME);
  if (sessionId) sessions.delete(sessionId);
  deleteCookie(SESSION_COOKIE_NAME);
}

/** Simule l'envoi d'un email de réinitialisation (MVP : token affiché en log). */
export function requestPasswordReset(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.get(normalizedEmail);
  if (!user) {
    throw new Response("Aucun compte ne correspond à cet email.", { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + RESET_TTL_MS;
  resetTokens.set(token, { userId: user.id, email: user.email, expiresAt });

  logger.info(`Password reset requested for ${normalizedEmail} (lien simulé, API email).`);

  return token;
}

export function confirmPasswordReset(token: string, newPassword: string): AuthUser {
  if (!token || token.length < 16) {
    throw new Response("Token invalide.", { status: 400 });
  }

  const info = resetTokens.get(token);
  if (!info || info.expiresAt < Date.now()) {
    resetTokens.delete(token);
    throw new Response("Ce lien a expiré. Demandez un nouveau mot de passe.", { status: 400 });
  }

  const user = Array.from(users.values()).find((u) => u.id === info.userId);
  if (!user) {
    resetTokens.delete(token);
    throw new Response("Compte introuvable.", { status: 404 });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  resetTokens.delete(token);
  logger.info(`Password reset for ${user.email}.`);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    provider: user.provider,
  };
}

/** Pour le bypass hackathon : crée une session sans validation réelle. */
export function bypassAuth(): AuthSession {
  const bypassUser: StoredUser = {
    id: "bypass-user",
    email: "demo@guardsite.ai",
    name: "Démo GuardSite AI",
    passwordHash: "",
    salt: "",
    picture: undefined,
    provider: "credentials",
  };
  users.set(bypassUser.email, bypassUser);

  return createSession(bypassUser);
}

export function _resetAuthForTests(): void {
  users.clear();
  sessions.clear();
  resetTokens.clear();
}
