import { TriangleAlert } from "lucide-react";
import { useAiStatus } from "@/hooks/use-ai-status";

/**
 * Bandeau affiché quand aucune clé Gemini n'est configurée côté serveur :
 * les générations utilisent alors le fallback déterministe. Discret et
 * non bloquant (le produit reste utilisable).
 */
export function AiStatusBanner() {
  const { data } = useAiStatus();
  if (!data?.degraded) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" />
      <span>
        Mode dégradé : aucune clé IA n&apos;est configurée, les contenus seront générés par les
        templates locaux.
      </span>
    </div>
  );
}
