import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FilePen,
  FileText,
  LayoutTemplate,
  RefreshCw,
  Rocket,
  Star,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { toggleStar, useProjects, setExportedAt, setDeployedUrl } from "@/lib/store";
import {
  deploySite,
  downloadSiteHtml,
  printSiteHtml,
  siteExportFilename,
} from "@/lib/deploy.functions";
import { findPalette } from "@/lib/palettes";
import { useGenerate } from "@/hooks/use-generate";
import { cn } from "@/lib/utils";
import { seoMeta } from "@/lib/seo";
import { useRequireAuth } from "@/lib/auth/auth.guard";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: seoMeta(
      "Fiche projet — GuardSite AI",
      "Template retenu, justification IA et contenus rédigés pour votre site vitrine.",
    ),
  }),
  component: ProjectDetail,
});

const TABS = [
  { id: "content", label: "Contenus", icon: LayoutTemplate },
  { id: "preview", label: "Prévisualisation", icon: Eye },
  { id: "code", label: "Code", icon: Code2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ProjectDetail() {
  useRequireAuth();
  const { projectId } = Route.useParams();
  const project = useProjects().find((p) => p.id === projectId);
  const [tab, setTab] = useState<TabId>("content");
  const [exportError, setExportError] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [copied, setCopied] = useState(false);
  const runDeploy = useServerFn(deploySite);
  const generate = useGenerate();

  async function handleDeploy() {
    if (!project?.siteHtml || deploying) return;
    setDeploying(true);
    setDeployError(null);
    try {
      // Nom de projet Vercel déjà utilisé (URL https://{projet}.vercel.app) :
      // le re-déploiement conserve alors la même URL publique.
      const existingSlug = project.deployedUrl?.match(/^https:\/\/([a-z0-9-]+)\.vercel\.app$/)?.[1];
      const payload = await runDeploy({
        data: {
          id: project.id,
          siteName: project.brief.siteName,
          html: project.siteHtml,
          ...(existingSlug ? { slug: existingSlug } : {}),
        },
      });
      setDeployedUrl(project.id, payload.url);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "La mise en ligne a échoué.");
    } finally {
      setDeploying(false);
    }
  }

  async function copySiteHtml() {
    if (!project?.siteHtml) return;
    try {
      await navigator.clipboard.writeText(project.siteHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setExportError("Impossible de copier le code dans ce navigateur.");
    }
  }

  function handleExport() {
    if (!project?.siteHtml) return;
    setExportError(null);
    const ok = downloadSiteHtml(project.siteHtml, project.brief.siteName);
    if (ok) {
      setExportedAt(project.id, new Date().toISOString());
    } else {
      setExportError("Le téléchargement du site a échoué dans ce navigateur.");
    }
  }

  if (!project) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Ce projet n&apos;existe pas ou a été supprimé.
          </p>
          <Link to="/projects" search={{}} className="mt-4 inline-block text-sm text-primary-glow">
            Retour aux projets
          </Link>
        </main>
      </AppShell>
    );
  }

  const palette = findPalette(project.brief.palette);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to="/projects"
          search={{}}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Projets
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{project.brief.siteName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.brief.sector} · palette {palette.label}
              {project.brief.chatbot ? " · chatbot activé" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <button
              type="button"
              onClick={handleDeploy}
              disabled={deploying || !project.siteHtml}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              <Rocket className="h-3.5 w-3.5" />
              {deploying
                ? "Mise en ligne…"
                : project.deployedUrl
                  ? "Mettre à jour le site"
                  : "Mettre en ligne"}
            </button>
            <Link
              to="/wizard"
              search={{ edit: project.id }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <FilePen className="h-3.5 w-3.5" /> Modifier le brief
            </Link>
            <button
              type="button"
              onClick={() => generate.mutate(project.brief)}
              disabled={generate.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", generate.isPending && "animate-spin")} />
              {generate.isPending ? "Régénération…" : "Régénérer"}
            </button>
            <button
              type="button"
              onClick={() => toggleStar(project.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Star
                className={cn("h-3.5 w-3.5", project.starred && "fill-current text-primary-glow")}
              />
              {project.starred ? "Favori" : "Ajouter aux favoris"}
            </button>
          </div>
        </div>

        {project.deployedUrl && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            <span className="font-medium">Site en ligne :</span>
            <a
              href={project.deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-emerald-400 underline-offset-2"
            >
              {project.deployedUrl}
            </a>
            <span className="text-emerald-600">(hébergé par Vercel)</span>
          </div>
        )}

        {deployError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {deployError}
          </div>
        )}

        {project.exportedAt && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            <span className="font-medium">Site exporté :</span>
            <span>
              {new Date(project.exportedAt).toLocaleString()} —{" "}
              {siteExportFilename(project.brief.siteName)}
            </span>
            <span className="text-emerald-600">
              (fichier autonome, ouvrable dans un navigateur)
            </span>
          </div>
        )}

        {exportError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {exportError}
          </div>
        )}

        {project.result.isFallback && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Contenus générés en mode dégradé :{" "}
            {project.result.fallbackReason ??
              "le moteur IA était indisponible au moment de la génération."}{" "}
            Vous pouvez régénérer plus tard.
          </div>
        )}

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs transition-colors sm:gap-2 sm:px-3 sm:text-sm",
                tab === t.id
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">{t.label}</span>
              <span className="sr-only sm:hidden">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === "content" && (
          <div className="mt-6 rounded-2xl glass-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <LayoutTemplate className="h-4 w-4 text-primary-glow" />
              Template sélectionné : {project.result.templateName}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{project.result.reason}</p>
            <p className="mt-4 text-sm text-foreground">{project.result.content.tagline}</p>
            <p className="mt-2 text-sm text-muted-foreground">{project.result.content.about}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {project.result.content.sections.map((s) => (
                <li key={s.key} className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.key}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{s.heading}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 inline-flex rounded-lg gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              {project.result.content.cta}
            </p>
          </div>
        )}

        {tab === "preview" && (
          <div className="mt-6">
            {project.siteHtml ? (
              <iframe
                title={`Aperçu de ${project.brief.siteName}`}
                srcDoc={project.siteHtml}
                sandbox="allow-scripts"
                className="h-[70vh] w-full rounded-2xl border border-border bg-white"
              />
            ) : (
              <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                Aucune prévisualisation disponible pour ce projet (généré avant l&apos;activation du
                rendu HTML).
              </p>
            )}
          </div>
        )}

        {tab === "code" && (
          <div className="mt-6">
            {project.siteHtml ? (
              <div>
                <div className="mb-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!project?.siteHtml) return;
                      setExportError(null);
                      if (!printSiteHtml(project.siteHtml)) {
                        setExportError("L'impression n'a pas pu être lancée dans ce navigateur.");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Exporter en PDF
                  </button>
                  <button
                    type="button"
                    onClick={copySiteHtml}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copié !" : "Copier le code"}
                  </button>
                </div>
                <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-border bg-black/90 p-5 text-xs leading-relaxed text-green-300">
                  <code>{project.siteHtml}</code>
                </pre>
              </div>
            ) : (
              <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                Aucun code disponible pour ce projet.
              </p>
            )}
          </div>
        )}

        {project.brief.articles.length > 0 && tab === "content" && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Articles fournis
            </h2>
            <ul className="mt-3 space-y-2">
              {project.brief.articles.map((a, i) => (
                <li key={i} className="rounded-xl border border-border p-3">
                  <p className="text-sm text-foreground">{a.title || "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
