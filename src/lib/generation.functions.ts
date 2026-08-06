import { createServerFn } from "@tanstack/react-start";
import { briefSchema } from "./brief";
import type { Brief, MatchResult } from "./brief";

export type GenerationPayload = {
  result: MatchResult;
  /** HTML complet du site vitrine, prêt pour la prévisualisation et la mise en ligne. */
  siteHtml: string;
};

/** Brique 1 : matching intelligent du template + génération des contenus + rendu HTML. */
export const generateSitePlan = createServerFn({ method: "POST" })
  .validator((data: unknown): Brief => {
    const parsed = briefSchema.safeParse(data);
    if (!parsed.success) {
      throw new Response(
        "Brief invalide : vérifiez les champs du formulaire (10 caractères minimum, 10 articles maximum).",
        { status: 400 },
      );
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<GenerationPayload> => {
    const { assertGenerationAllowed } = await import("./rate-limit.server");
    assertGenerationAllowed();

    const [{ matchTemplate }, { buildSite }] = await Promise.all([
      import("./matching.server"),
      import("./templates/engine"),
    ]);
    const result = await matchTemplate(data);
    const siteHtml = buildSite(data, result);
    return { result, siteHtml };
  });
