import { z } from "zod";
import catalogRaw from "./templates.json?raw";
import { escapeHtml } from "../templates/engine";
import { generateJson, lastAiFailureReason } from "../llm.server";
import { logger } from "../logger";

/**
 * Catalogue local de composants (templates.json).
 *
 * Le catalogue vit dans un fichier JSON local ; un wrapper LLM (SDK Gemini)
 * sélectionne un composant puis injecte les variables réelles dans le code
 * HTML via des jetons `{{VAR}}`.
 *
 * Toute valeur utilisateur/LLM est échappée avant injection (anti-XSS) et les
 * jetons injectés sont strictement limités aux variables_attendues du
 * composant (injection chirurgicale sûre).
 */

export const catalogEntrySchema = z.object({
  id: z.string().min(1).max(64),
  category: z.string().min(1).max(64),
  framework: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  keywords: z.array(z.string()).default([]),
  sectors: z.array(z.string()).default([]),
  html_code: z.string().min(1),
  variables_attendues: z.array(z.string()).default([]),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

let _catalog: CatalogEntry[] | null = null;

/** Charge et valide le catalogue une seule fois (fonction pure, testable). */
export function loadCatalog(): CatalogEntry[] {
  if (_catalog) return _catalog;
  const parsed: unknown = JSON.parse(catalogRaw);
  if (!Array.isArray(parsed)) throw new Error("Catalogue invalide : tableau attendu.");
  const entries = parsed.map((entry) => catalogEntrySchema.parse(entry));
  _catalog = entries;
  return entries;
}

/** Permet aux tests de recharger un catalogue modifié. */
export function _resetCatalogForTests(): void {
  _catalog = null;
}

export const getCatalog = (): CatalogEntry[] => loadCatalog();

export function findComponent(id: string): CatalogEntry | undefined {
  return getCatalog().find((c) => c.id === id);
}

const TOKEN_RE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

/** Transforme une valeur list (ex. "A ; B ; C") en bloc de lignes `<li>`. */
function renderList(value: string): string {
  return value
    .split(";")
    .map((s) => escapeHtml(s.trim()))
    .filter(Boolean)
    .map((s) => `<li class="flex text-sm text-slate-600"><span class="mr-2">•</span>${s}</li>`)
    .join("");
}

/**
 * Injection dynamique sécurisée : remplace les jetons `{{VAR}}` du code par
 * leur valeur échappée. Les jetons non attendus sont retirés (filet de
 * sécurité) et les variables inconnues sont ignorées — aucune balise libre.
 * Retourne aussi la liste des variables attendues non fournies.
 */
export function injectVariables(
  html: string,
  variables: Record<string, string | undefined>,
): { html: string; missing: string[] } {
  const missing: string[] = [];
  let out = html.replace(TOKEN_RE, (match, raw: string) => {
    const key = raw.toLowerCase();
    if (key === "features_list") return renderList(variables[key] ?? "");
    const value = variables[key];
    if (value === undefined || value === "") {
      missing.push(key);
      return "";
    }
    return escapeHtml(value);
  });
  // Filet de sécurité : aucun jeton ne doit subsister après injection.
  out = out.replace(TOKEN_RE, "");
  return { html: out, missing };
}

/**
 * Injection des variables attendues du composant. `variables_attendues`
 * sert de liste blanche : on ne déploie que ces jetons.
 */
export function injectAllowedVariables(
  entry: CatalogEntry,
  variables: Record<string, string | undefined>,
): { html: string; missing: string[] } {
  const allowed = new Set(entry.variables_attendues ?? []);
  const filtered: Record<string, string | undefined> = {};
  for (const key of allowed) {
    if (variables[key] !== undefined) filtered[key] = variables[key];
  }
  return injectVariables(entry.html_code, filtered);
}

/**
 * Rendu final d'un composant : injection des variables puis filtrage des
 * jetons résiduels éventuels. Fonction pure (testable).
 */
export function renderComponent(
  entry: CatalogEntry,
  variables: Record<string, string | undefined>,
): { html: string; missing: string[] } {
  return injectAllowedVariables(entry, variables);
}

/** Recherche déterministe par mots-clés (fallback sans LLM). */
export function searchComponents(query: string): CatalogEntry[] {
  const terms = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = getCatalog().map((c) => {
    const hay = [c.name, c.description, c.category, ...(c.keywords ?? []), ...(c.sectors ?? [])]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
      if ((c.keywords ?? []).some((k) => k.includes(t))) score += 2;
    }
    return { c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.c);
}

// ---------------------------------------------------------------------------
// Couche LLM générique (fournisseur interchangeable — SDK Gemini branché).
// ---------------------------------------------------------------------------

export const componentSelectionSchema = z.object({
  componentId: z.string().min(1).max(64),
  reason: z.string().min(1).max(500),
  variables: z.record(z.string()).optional().default({}),
});

export type ComponentSelection = z.infer<typeof componentSelectionSchema>;

const SYSTEM = `Tu es un moteur de sélection de composants d'interface à partir d'un catalogue local.
L'utilisateur décrit un besoin (carte métrique, formulaire de contact, carte produit, témoignage, tarif, bannière…).
1. Choisis l'identifiant du composant le plus adapté parmi la liste fournie.
2. Propose des valeurs contextualisées (en français) pour ses variables.
Réponds STRICTEMENT en JSON, sans markdown, au format:
{"componentId":string,"reason":string,"variables":{...}}
Ne fournis que des variables appartenant au composant choisi.`;

/** Nettoie une réponse LLM brute et la valide (fonction pure, testable). */
export function normalizeSelection(raw: string): ComponentSelection | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const validated = componentSelectionSchema.safeParse(parsed);
  if (!validated.success) return null;
  if (!findComponent(validated.data.componentId)) return null;
  return validated.data;
}

/** Appelle le moteur IA (xAI/Gemini). Retourne `""` si indisponible. */
async function callLLM(payload: unknown): Promise<string> {
  return (await generateJson(SYSTEM, JSON.stringify(payload))) ?? "";
}

function fallbackSelection(requirement: string): CatalogSelection {
  const matches = searchComponents(requirement);
  const entry = matches[0] ?? getCatalog()[0]!;
  const aiError = lastAiFailureReason();
  return {
    entry,
    variables: {},
    reason: aiError
      ? `Sélection déterministe par mots-clés — moteur IA indisponible (${aiError}).`
      : "Sélection déterministe par mots-clés — moteur IA indisponible.",
    isFallback: true,
  };
}

export type CatalogSelection = {
  entry: CatalogEntry;
  variables: Record<string, string>;
  reason: string;
  isFallback: boolean;
};

/**
 * Sélectionne le composant le plus adapté à un besoin : tente le moteur IA,
 * sinon bascule déterministe.
 */
export async function selectComponent(requirement: string): Promise<CatalogSelection> {
  const meta = getCatalog().map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    keywords: c.keywords ?? [],
  }));

  try {
    const raw = await callLLM({ requirement, components: meta });
    const selection = normalizeSelection(raw);
    if (!selection) return fallbackSelection(requirement);
    const entry = findComponent(selection.componentId)!;
    const variables: Record<string, string> = {};
    for (const key of entry.variables_attendues ?? []) {
      const v = selection.variables[key];
      if (typeof v === "string" && v.trim() !== "") variables[key] = v;
    }
    return { entry, variables, reason: selection.reason, isFallback: false };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(`Catalogue LLM indisponible (${reason}) — bascule déterministe.`);
    const fb = fallbackSelection(requirement);
    return fb;
  }
}
