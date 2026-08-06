import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import DOMPurify from "dompurify";
import { Loader2, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { renderCatalogComponent, type CatalogRenderPayload } from "@/lib/catalog/catalog.functions";
import { seoMeta } from "@/lib/seo";
import { inputClass, textareaClass } from "@/components/ui/field";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: seoMeta(
      "Catalogue — GuardSite AI",
      "Catalogue local de composants : le moteur d'IA sélectionne le composant et injecte vos données.",
    ),
  }),
  component: Catalog,
});

const EXAMPLES = [
  "Carte métrique pour suivre le chiffre d'affaires",
  "Formulaire de contact pour une agence",
  "Carte produit pour une boutique en ligne",
  "Carte tarif pour un abonnement",
  "Bannière de lancement avec appel à l'action",
  "Liste des dernières activités",
];

const SAMPLE_VARIABLES: Record<string, string> = {
  title: "Chiffre d'affaires",
  metric_value: "1 240 000 FCFA",
  status: "+12%",
  status_class: "bg-emerald-100 text-emerald-700",
  delta: "vs mois dernier",
};

function Catalog() {
  const [requirement, setRequirement] = useState(EXAMPLES[0] ?? "");
  const [variablesText, setVariablesText] = useState(JSON.stringify(SAMPLE_VARIABLES, null, 2));
  const [result, setResult] = useState<CatalogRenderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    let variables: Record<string, string> = {};
    try {
      variables = JSON.parse(variablesText || "{}");
    } catch {
      setError("Variables invalides : JSON attendu.");
      setLoading(false);
      return;
    }
    try {
      const payload = await renderCatalogComponent({ data: { requirement, variables } });
      // Filet anti-XSS côté client : le HTML injecté est passé au sanitiser
      // (scripts, handlers d'événements et javascript: URLs retirés).
      // Garde-fou pour un rendu serveur improbable : DOMPurify n'est pas
      // disponible hors navigateur.
      const html = DOMPurify.isSupported ? DOMPurify.sanitize(payload.html) : payload.html;
      setResult({ ...payload, html });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la sélection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold text-foreground">Catalogue local</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le LLM sélectionne un composant du catalogue local (templates.json) et injecte vos
          variables dans le code HTML. Démonstration du pipeline.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Besoin (envoyé au LLM)
              </label>
              <select
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className={inputClass}
              >
                {EXAMPLES.map((ex) => (
                  <option key={ex} value={ex} className="bg-card">
                    {ex}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Variables (JSON)</label>
              <textarea
                value={variablesText}
                onChange={(e) => setVariablesText(e.target.value)}
                rows={9}
                spellCheck={false}
                className={textareaClass}
              />
            </div>

            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Sélection en cours…" : "Sélectionner et injecter"}
            </button>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {result && (
              <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Composant :</span>{" "}
                  <span className="font-medium text-foreground">{result.name}</span>{" "}
                  <span className="text-muted-foreground">({result.componentId})</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Catégorie :</span> {result.category} ·{" "}
                  {result.framework}
                </p>
                <p>
                  <span className="text-muted-foreground">Source :</span>{" "}
                  <span
                    className={
                      result.isFallback
                        ? "font-medium text-amber-500"
                        : "font-medium text-emerald-500"
                    }
                  >
                    {result.isFallback ? "Déterministe (LLM indisponible)" : "IA (Gemini)"}
                  </span>
                </p>
                <p className="text-muted-foreground">{result.reason}</p>
                {result.missing.length > 0 && (
                  <p className="text-muted-foreground">
                    Variables manquantes : {result.missing.join(", ")}
                  </p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground">Aperçu du rendu</h2>
            {result ? (
              <div className="overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm">
                <div
                  dangerouslySetInnerHTML={{ __html: result.html }}
                  className="[&_img]:max-w-full"
                />
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Lancez une sélection pour voir le composant rendu.
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
