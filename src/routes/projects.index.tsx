import { createFileRoute, Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { removeProject, toggleStar, useProjects } from "@/lib/store";
import { cn } from "@/lib/utils";
import { seoMeta } from "@/lib/seo";
import { ProjectListItem } from "@/components/projects/project-list-item";
import { useRequireAuth } from "@/lib/auth/auth.guard";

type ProjectSearch = { filter?: "starred" };

export const Route = createFileRoute("/projects/")({
  validateSearch: (search: Record<string, unknown>): ProjectSearch =>
    search["filter"] === "starred" ? { filter: "starred" } : {},
  head: () => ({
    meta: seoMeta(
      "Projets — GuardSite AI",
      "Tous les sites vitrines générés par l'IA : favoris, détails et suppression.",
    ),
  }),
  component: Projects,
});

function Projects() {
  useRequireAuth();
  const { filter } = Route.useSearch();
  const all = useProjects();
  const projects = filter === "starred" ? all.filter((p) => p.starred) : all;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {filter === "starred" ? "Favoris" : "Tous les projets"}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/projects"
              search={{}}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                filter ? "border-border text-muted-foreground" : "border-primary text-foreground",
              )}
            >
              Tous
            </Link>
            <Link
              to="/projects"
              search={{ filter: "starred" }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                filter ? "border-primary text-foreground" : "border-border text-muted-foreground",
              )}
            >
              Favoris
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucun projet dans cette vue.</p>
            <Link
              to="/wizard"
              className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Wand2 className="h-4 w-4" /> Générer un site
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {projects.map((p) => (
              <ProjectListItem
                key={p.id}
                project={p}
                onStar={() => toggleStar(p.id)}
                onDelete={() => {
                  removeProject(p.id);
                  toast.success("Projet supprimé");
                }}
              />
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
