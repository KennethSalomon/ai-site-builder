import { Link } from "@tanstack/react-router";
import { Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedProject } from "@/lib/store";

/** Ligne de projet réutilisée par la liste et le dashboard (actions optionnelles). */
export function ProjectListItem({
  project,
  onStar,
  onDelete,
}: {
  project: GeneratedProject;
  onStar?: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/60">
      <Link to="/projects/$projectId" params={{ projectId: project.id }} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.brief.siteName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {project.brief.sector} · {project.result.templateName} ·{" "}
          {new Date(project.createdAt).toLocaleDateString("fr-FR")}
        </p>
        {project.deployedUrl && (
          <a
            href={project.deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            En ligne
          </a>
        )}
      </Link>
      {onStar && (
        <button
          type="button"
          aria-label={project.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          onClick={onStar}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
        >
          <Star className={cn("h-4 w-4", project.starred && "fill-current text-primary-glow")} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Supprimer le projet"
          onClick={onDelete}
          className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
