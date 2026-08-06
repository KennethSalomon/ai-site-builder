/**
 * Mode démo (bypass hackathon + connexion Google simulée).
 *
 * Côté serveur : actif en dehors de la production, ou en production
 * uniquement si `GUARDSITE_DEMO=1` est positionné à l'exécution.
 * Côté client : actif en dev, ou si `VITE_DEMO=1` au build.
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") {
    return process.env["NODE_ENV"] !== "production" || process.env["GUARDSITE_DEMO"] === "1";
  }
  const env = import.meta.env as { DEV?: boolean; VITE_DEMO?: string };
  return env.DEV === true || env.VITE_DEMO === "1";
}
