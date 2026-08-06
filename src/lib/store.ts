import { useSyncExternalStore } from "react";
import type { Brief, MatchResult } from "./brief";

export type GeneratedProject = {
  id: string;
  createdAt: string;
  brief: Brief;
  result: MatchResult;
  /** HTML complet généré côté serveur. Absent pour les projets antérieurs. */
  siteHtml?: string;
  /** Date de la dernière exportation du HTML (téléchargement index.html). */
  exportedAt?: string;
  /** URL publique Vercel une fois le site mis en ligne. */
  deployedUrl?: string;
  starred: boolean;
};

const STORE_VERSION = 2;
const KEY = `GuardSite AI.projects.v${STORE_VERSION}`;
const LEGACY_KEY = "GuardSite AI.projects.v1";

let cache: GeneratedProject[] | null = null;
const listeners = new Set<() => void>();

const EMPTY: GeneratedProject[] = [];

/** Validation défensive : on ne charge que les entrées conformes. */
function isValidProject(value: unknown): value is GeneratedProject {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p["id"] === "string" &&
    typeof p["createdAt"] === "string" &&
    typeof p["brief"] === "object" &&
    p["brief"] !== null &&
    typeof p["result"] === "object" &&
    p["result"] !== null
  );
}

/** Migration du format v1 (projets sans siteHtml) vers v2. */
function migrateLegacy(parsed: unknown): GeneratedProject[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidProject).map((p) => ({
    ...p,
    starred: typeof p.starred === "boolean" ? p.starred : false,
  }));
}

function read(): GeneratedProject[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    let parsed: unknown = raw ? JSON.parse(raw) : null;

    if (parsed === null) {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        parsed = migrateLegacy(JSON.parse(legacy));
        window.localStorage.setItem(KEY, JSON.stringify(parsed));
        window.localStorage.removeItem(LEGACY_KEY);
      }
    }

    const projects = Array.isArray(parsed) ? parsed.filter(isValidProject) : [];
    if (Array.isArray(parsed) && projects.length !== parsed.length) {
      // Entrées corrompues écartées : on réécrit le store nettoyé.
      window.localStorage.setItem(KEY, JSON.stringify(projects));
    }
    cache = projects;
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: GeneratedProject[]): boolean {
  cache = next;
  let persisted = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota dépassé / navigation privée : le cache mémoire reste vivant mais rien
    // ne sera conservé après rechargement. Le retour permet d'alerter l'utilisateur.
    persisted = false;
  }
  listeners.forEach((l) => l());
  return persisted;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjects(): GeneratedProject[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addProject(
  brief: Brief,
  result: MatchResult,
  siteHtml?: string,
): { project: GeneratedProject; persisted: boolean } {
  const project: GeneratedProject = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    brief,
    result,
    starred: false,
    ...(siteHtml ? { siteHtml } : {}),
  };
  const persisted = write([project, ...read()]);
  return { project, persisted };
}

export function toggleStar(id: string) {
  write(read().map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)));
}

export function removeProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function setExportedAt(id: string, exportedAt: string) {
  write(read().map((p) => (p.id === id ? { ...p, exportedAt } : p)));
}

export function setDeployedUrl(id: string, deployedUrl: string) {
  write(read().map((p) => (p.id === id ? { ...p, deployedUrl } : p)));
}

export function getProject(id: string) {
  return read().find((p) => p.id === id);
}
