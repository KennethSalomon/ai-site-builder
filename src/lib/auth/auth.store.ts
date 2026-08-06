import { useSyncExternalStore } from "react";
import type { AuthSession, AuthUser } from "./auth.types";

/**
 * Store d'authentification — logique pure, inspirée du store de projets
 * (`lib/store.ts`). Aucun JSX ni appel côté serveur : les setters sont
 * appelés par les composants après réception d'une session serveur.
 */

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  /** `true` pendant la vérification initiale de la session (côté serveur). */
  loading: boolean;
};

let cache: AuthState = { user: null, accessToken: null, loading: true };
const listeners = new Set<() => void>();

function read(): AuthState {
  return cache;
}

/** Snapshot initial : en attente de la vérification serveur, jamais "déconnecté". */
function serverSnapshot(): AuthState {
  return { user: null, accessToken: null, loading: true };
}

function write(next: AuthState): AuthState {
  cache = next;
  listeners.forEach((l) => l());
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}

/** Lecture synchrone de l'état courant (hors composant). */
export function getAuthState(): AuthState {
  return read();
}

export function setSession(session: AuthSession | null): void {
  write({
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    loading: false,
  });
}

export function clearSessionClient(): void {
  write({ user: null, accessToken: null, loading: true });
}

export function startLoading(): void {
  write({ ...cache, loading: true });
}
