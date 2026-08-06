import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, LayoutTemplate, Star, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useProjects } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates/registry";
import { seoMeta } from "@/lib/seo";
import { ProjectListItem } from "@/components/projects/project-list-item";
import { useRequireAuth } from "@/lib/auth/auth.guard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: seoMeta(
      "Dashboard — GuardSite AI",
      "Vue d'ensemble de vos sites générés, templates disponibles et projets favoris.",
    ),
  }),
  component: Dashboard,
});

function Dashboard() {
  useRequireAuth();
  const projects = useProjects();
  const starred = projects.filter((p) => p.starred).length;

  const stats = [
    { label: "Sites générés", value: projects.length, icon: FolderOpen },
    { label: "Favoris", value: starred, icon: Star },
    { label: "Templates disponibles", value: TEMPLATES.length, icon: LayoutTemplate },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              État du workspace GuardSite AI : générations, favoris et templates disponibles.
            </p>
          </div>
          <Link
            to="/wizard"
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Wand2 className="h-4 w-4" /> Nouveau site
          </Link>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl glass-panel p-5">
              <s.icon className="h-4 w-4 text-primary-glow" />
              <p className="mt-3 text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Générations récentes
          </h2>
          {projects.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Aucun site pour l&apos;instant.{" "}
              <Link to="/wizard" className="text-primary-glow">
                Lancez votre premier brief
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {projects.slice(0, 5).map((p) => (
                <ProjectListItem key={p.id} project={p} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Banque de templates
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <li key={t.id} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                  {t.sectors.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
