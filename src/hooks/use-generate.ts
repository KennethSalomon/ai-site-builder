import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { generateSitePlan } from "@/lib/generation.functions";
import { addProject } from "@/lib/store";
import type { Brief } from "@/lib/brief";

/** Extrait le message d'une erreur de server function (Response ou Error). */
async function describeError(error: unknown): Promise<string> {
  if (error instanceof Response) {
    try {
      const text = await error.text();
      if (text.trim()) return text;
    } catch {
      // corps illisible : on retombe sur le message générique.
    }
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : "La génération a échoué. Réessayez dans un instant.";
}

/** Lance la génération, persiste le projet et ouvre sa fiche. */
export function useGenerate() {
  const run = useServerFn(generateSitePlan);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (brief: Brief) => run({ data: brief }),
    onSuccess: (payload, brief) => {
      const { project, persisted } = addProject(brief, payload.result, payload.siteHtml);
      if (payload.result.isFallback) {
        toast.warning(
          payload.result.fallbackReason
            ? `Génération en mode dégradé : ${payload.result.fallbackReason}`
            : "Génération en mode dégradé : l'IA était indisponible, les contenus sont déterministes.",
          { duration: 6000 },
        );
      } else {
        toast.success(`Template retenu : ${payload.result.templateName}`);
      }
      if (!persisted) {
        toast.warning("Stockage local plein : ce projet ne sera pas conservé après rechargement.");
      }
      void navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    },
    onError: async (error) => {
      console.error(error);
      toast.error(await describeError(error));
    },
  });
}
