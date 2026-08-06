import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { SECTORS } from "@/lib/templates/registry";
import { PALETTES } from "@/lib/palettes";
import { getProject } from "@/lib/store";
import { emptyBrief, describeBriefError, type Brief } from "@/lib/brief";
import { useGenerate } from "@/hooks/use-generate";
import { AiStatusBanner } from "@/components/ai-status-banner";
import { cn } from "@/lib/utils";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { seoMeta } from "@/lib/seo";
import { useRequireAuth } from "@/lib/auth/auth.guard";

type WizardSearch = { edit?: string | undefined };

export const Route = createFileRoute("/wizard")({
  validateSearch: (search: Record<string, unknown>): WizardSearch => ({
    edit: typeof search["edit"] === "string" ? search["edit"] : undefined,
  }),
  head: () => ({
    meta: seoMeta(
      "Brief guidé — GuardSite AI",
      "Trois étapes pour cadrer votre site vitrine : identité, contenus et options, puis génération par IA.",
    ),
  }),
  component: Wizard,
});

const STEPS = ["Identité", "Contenus", "Options"] as const;

/** Bornes alignées sur le schéma serveur (brief.ts). */
const MAX_ARTICLES = 10;
const MAX_LOGO_BYTES = 300_000;

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

const SOCIAL_PLACEHOLDERS: Record<string, string> = {
  facebook: "Lien ou pseudo Facebook",
  instagram: "Lien ou pseudo Instagram",
  whatsapp: "Numéro ou lien WhatsApp",
  email: "contact@site.com",
};

function Wizard() {
  useRequireAuth();
  const { edit } = Route.useSearch();
  const editingProject = useMemo(() => (edit ? getProject(edit) : undefined), [edit]);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>(() =>
    editingProject ? { ...editingProject.brief } : emptyBrief(),
  );
  const generate = useGenerate();

  const set = <K extends keyof Brief>(key: K, value: Brief[K]) =>
    setBrief((b) => ({ ...b, [key]: value }));

  function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo trop lourd : 300 Ko maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBrief((b) => ({ ...b, hasLogo: true, logoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  const hasSocial = Object.values(brief.socials ?? {}).some(
    (v) => typeof v === "string" && v.trim() !== "",
  );
  const hasArticle = brief.articles.some((a) => a.title.trim() || a.description.trim());
  const contentValid = hasSocial || hasArticle;

  const stepValid = [
    brief.siteName.trim().length > 0 && brief.description.trim().length >= 10,
    contentValid,
    true,
  ][step];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold text-foreground">
          {editingProject ? "Éditer le brief" : "Brief guidé"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {editingProject
            ? "Modifiez les champs puis régénérez : une nouvelle version du site sera créée."
            : "Trois étapes, puis l'IA sélectionne le template et rédige les contenus."}
        </p>

        <div className="mt-4">
          <AiStatusBanner />
        </div>

        {editingProject && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-foreground">
            <span>
              Édition du brief de « {editingProject.brief.siteName} » — la génération créera une
              nouvelle version du site.
            </span>
            <Link
              to="/wizard"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" /> Annuler l&apos;édition
            </Link>
          </div>
        )}

        <ol className="mt-6 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs transition-colors",
                  i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < step
                      ? "border-primary/50 text-primary-glow"
                      : "border-border text-muted-foreground",
                )}
                aria-label={`Étape ${i + 1} : ${label}`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              <span className="text-xs text-muted-foreground">{label}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-5 rounded-2xl glass-panel p-4 sm:p-6">
          {step === 0 && (
            <>
              <Field label="Nom du site">
                <input
                  value={brief.siteName}
                  onChange={(e) => set("siteName", e.target.value)}
                  maxLength={80}
                  placeholder="Ex. Marsal Smart Living"
                  className={inputClass}
                />
              </Field>
              <Field label="Secteur">
                <select
                  value={brief.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  className={inputClass}
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s} className="bg-card">
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Description de l'activité"
                hint={
                  <span>
                    {brief.description.trim().length}/10 caractères minimum ·{" "}
                    {brief.description.length}/2000 maximum
                  </span>
                }
              >
                <textarea
                  value={brief.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={2000}
                  placeholder="Activité, services, clientèle cible…"
                  className={textareaClass}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-foreground">Palette</p>
                <div className="flex flex-wrap gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set("palette", p.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                        brief.palette === p.id
                          ? "border-primary text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="flex">
                        {p.swatch.map((c) => (
                          <span
                            key={c}
                            style={{ background: c }}
                            className="h-4 w-4 rounded-full ring-1 ring-background [&:not(:first-child)]:-ml-1.5"
                          />
                        ))}
                      </span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">Articles / produits</p>
                  <button
                    type="button"
                    onClick={() =>
                      set("articles", [...brief.articles, { title: "", description: "" }])
                    }
                    disabled={brief.articles.length >= MAX_ARTICLES}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-opacity hover:text-foreground disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </button>
                </div>
                {brief.articles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun article — le template restera en mode vitrine simple.
                  </p>
                )}
                {brief.articles.length >= MAX_ARTICLES && (
                  <p className="text-xs text-muted-foreground">
                    {MAX_ARTICLES} articles maximum — retirez-en pour en ajouter.
                  </p>
                )}
                {brief.articles.map((a, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex gap-2">
                      <input
                        value={a.title}
                        onChange={(e) =>
                          set(
                            "articles",
                            brief.articles.map((x, j) =>
                              j === i ? { ...x, title: e.target.value } : x,
                            ),
                          )
                        }
                        maxLength={120}
                        placeholder="Titre"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        aria-label="Supprimer l'article"
                        onClick={() =>
                          set(
                            "articles",
                            brief.articles.filter((_, j) => j !== i),
                          )
                        }
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      value={a.description}
                      onChange={(e) =>
                        set(
                          "articles",
                          brief.articles.map((x, j) =>
                            j === i ? { ...x, description: e.target.value } : x,
                          ),
                        )
                      }
                      maxLength={500}
                      placeholder="Description courte"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["facebook", "instagram", "whatsapp", "email"] as const).map((k) => (
                  <label key={k} className="block space-y-2">
                    <span className="text-sm text-foreground">{SOCIAL_LABELS[k]}</span>
                    <input
                      value={brief.socials[k] ?? ""}
                      onChange={(e) => set("socials", { ...brief.socials, [k]: e.target.value })}
                      maxLength={300}
                      placeholder={SOCIAL_PLACEHOLDERS[k]}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm text-foreground">Logo</p>
                {brief.logoDataUrl ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={brief.logoDataUrl}
                      alt="Votre logo"
                      className="h-12 w-12 rounded-lg border border-border bg-card object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        set("hasLogo", false);
                        set("logoDataUrl", undefined);
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:text-destructive"
                    >
                      Retirer le logo
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      <Upload className="h-3.5 w-3.5" /> Choisir un fichier
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoFile}
                      />
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">
                      PNG, JPG, WEBP ou GIF — 300 Ko maximum.
                    </p>
                  </>
                )}
              </div>
              <label className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm text-foreground">Ajouter un chatbot d&apos;accueil</span>
                <input
                  type="checkbox"
                  checked={brief.chatbot}
                  onChange={(e) => set("chatbot", e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>
            </>
          )}
        </div>

        {step === 1 && !contentValid && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Ajoutez au moins un réseau social (étape « Options ») ou un article pour continuer.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-opacity hover:text-foreground disabled:opacity-40 sm:w-auto sm:py-2"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40 sm:w-auto sm:py-2"
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const payload = {
                  ...brief,
                  siteName: brief.siteName.trim(),
                  description: brief.description.trim(),
                };
                const error = describeBriefError(payload);
                if (error) {
                  toast.error(error);
                  return;
                }
                generate.mutate(payload);
              }}
              disabled={
                generate.isPending || brief.description.trim().length < 10 || !brief.siteName.trim()
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40 sm:w-auto sm:py-2"
            >
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {editingProject ? "Régénérer le site" : "Générer le site"}
            </button>
          )}
        </div>
      </main>
    </AppShell>
  );
}
