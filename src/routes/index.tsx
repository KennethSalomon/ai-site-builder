import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AiStatusBanner } from "@/components/ai-status-banner";
import { SECTORS } from "@/lib/templates/registry";
import { emptyBrief, describeBriefError } from "@/lib/brief";
import { useGenerate } from "@/hooks/use-generate";
import { inputClass } from "@/components/ui/field";

const BlackHoleHeroSection = lazy(() =>
  import("@/components/ui/blackhole-hero-section").then((m) => ({
    default: m.BlackHoleHeroSection,
  })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuardSite AI — Générateur de sites vitrines par IA" },
      {
        name: "description",
        content:
          "Décrivez votre activité et générez un site vitrine professionnel sur-mesure, prêt à déployer en un clic.",
      },
      { property: "og:title", content: "GuardSite AI — Générateur de sites vitrines par IA" },
      {
        property: "og:description",
        content: "Formulaire guidé, templates locaux et IA pour un site vitrine en minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [sector, setSector] = useState<string>(SECTORS[0]!);
  const [siteName, setSiteName] = useState("");
  const [description, setDescription] = useState("");
  const generate = useGenerate();

  const disabled = generate.isPending || description.trim().length < 10;

  return (
    <AppShell>
      <main className="relative isolate bg-black">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <ClientOnly
            fallback={
              <div className="grid h-full w-full animate-pulse place-items-center hero-surface">
                <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
              </div>
            }
          >
            <BlackHoleHeroSection
              className="h-full w-full"
              focus={[0.5, 0.22]}
              elevation={-6}
              fov={46}
              starBrightness={0.5}
              vignette={0.6}
              scrim="bottom"
              scrimStrength={0.55}
            />
          </ClientOnly>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-end px-4 pb-12 pt-20 sm:px-6 sm:pb-16 md:min-h-screen md:justify-center md:py-20">
          <div className="w-full max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> EPITNET 2026 — MVP
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Build with AI.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              Décrivez votre activité : l&apos;IA choisit le template, rédige les contenus et
              prépare votre site vitrine prêt à déployer.
            </p>

            <div className="mt-6">
              <AiStatusBanner />
            </div>

            <form
              className="mt-8 space-y-3 text-left"
              onSubmit={(e) => {
                e.preventDefault();
                const brief = {
                  ...emptyBrief(),
                  siteName: siteName.trim() || "Mon site",
                  sector,
                  description: description.trim(),
                };
                const error = describeBriefError(brief);
                if (error) {
                  toast.error(error);
                  return;
                }
                generate.mutate(brief);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  maxLength={80}
                  placeholder="Nom du site"
                  aria-label="Nom du site"
                  className={inputClass}
                />
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  aria-label="Secteur d'activité"
                  className={inputClass}
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s} className="bg-card">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative rounded-2xl border border-border bg-card/55 p-1 backdrop-blur">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  placeholder="Décrivez votre activité, vos services, votre clientèle…"
                  aria-label="Description de l'activité"
                  className="h-28 w-full resize-none rounded-xl bg-transparent p-4 pr-16 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:h-36"
                />
                <button
                  type="submit"
                  disabled={disabled}
                  aria-label="Générer"
                  className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground transition-opacity disabled:opacity-40"
                >
                  {generate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {description.trim().length} / 10 caractères minimum · {description.length} / 2000
                maximum.{" "}
                <Link to="/wizard" className="inline-flex items-center gap-1 text-primary-glow">
                  <Wand2 className="h-3 w-3" /> Utiliser le brief complet
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
