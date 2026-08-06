import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plug } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/connectors")({
  head: () => ({
    meta: seoMeta(
      "Connectors — GuardSite AI",
      "Activez les intégrations de déploiement, de contenus et de collaboration d'équipe.",
    ),
  }),
  component: Connectors,
});

const CONNECTORS = [
  {
    id: "export",
    name: "Export HTML",
    detail: "Téléchargement du site généré en fichier autonome.",
  },
  { id: "drive", name: "Google Drive", detail: "Import des logos et visuels produits." },
  { id: "whatsapp", name: "WhatsApp Business", detail: "Bouton de contact direct sur le site." },
  { id: "analytics", name: "Analytics", detail: "Suivi du trafic des sites publiés." },
];

function Connectors() {
  const [active, setActive] = useState<string[]>(["export"]);

  const toggle = (id: string, name: string) => {
    setActive((prev) => {
      const on = prev.includes(id);
      toast.success(on ? `${name} désactivé` : `${name} activé`);
      return on ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Branchez les services utilisés par le pipeline de génération et de publication.
        </p>
        <ul className="mt-6 space-y-3">
          {CONNECTORS.map((c) => {
            const on = active.includes(c.id);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Plug className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggle(c.id, c.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                    on
                      ? "gradient-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {on ? "Connecté" : "Connecter"}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </AppShell>
  );
}
