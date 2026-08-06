import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAiStatus, type AiStatus } from "@/lib/ai-status.functions";

/** État de l'intégration IA (clé Gemini configurée ?). Valeur par défaut prudente. */
export function useAiStatus() {
  const run = useServerFn(getAiStatus);
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => run({}),
    staleTime: 60_000,
    initialData: { configured: true, degraded: false } satisfies AiStatus,
  });
}
