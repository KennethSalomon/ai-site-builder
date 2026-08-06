import { createServerFn } from "@tanstack/react-start";
import { hasAiProvider } from "@/lib/llm.server";

export type AiStatus = {
  /** `true` si une clé IA est configurée (Grok/xAI ou Gemini). */
  configured: boolean;
  /** `true` si aucun moteur IA n'est disponible (bascule en mode dégradé). */
  degraded: boolean;
};

/**
 * État de l'intégration IA, exposé au client pour afficher un bandeau
 * quand aucun moteur IA n'est configuré (le pipeline bascule alors
 * sur le fallback déterministe).
 */
export const getAiStatus = createServerFn({ method: "GET" }).handler((): AiStatus => {
  const configured = hasAiProvider();
  return {
    configured,
    degraded: !configured,
  };
});
