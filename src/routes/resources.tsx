import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TEMPLATES } from "@/lib/templates/registry";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: seoMeta(
      "Resources — GuardSite AI",
      "Banque de templates locaux : styles, sections disponibles et tokens injectables.",
    ),
  }),
  component: Resources,
});

function Resources() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold text-foreground">Resources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates locaux disponibles pour le moteur d&apos;injection.
        </p>
        <ul className="mt-6 space-y-3">
          {TEMPLATES.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t.id}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Style : {t.style}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.sections.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.tokens.map((tok) => (
                  <code
                    key={tok}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tok}
                  </code>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
