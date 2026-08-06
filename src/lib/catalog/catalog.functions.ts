import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const catalogRequestSchema = z.object({
  requirement: z.string().min(3).max(500),
  variables: z.record(z.string()).default({}),
});

export type CatalogRenderPayload = {
  componentId: string;
  name: string;
  category: string;
  framework: string;
  reason: string;
  isFallback: boolean;
  missing: string[];
  html: string;
};

/** Brique 2 : catalogue local + sélection LLM + injection des variables. */
export const renderCatalogComponent = createServerFn({ method: "POST" })
  .validator((data: unknown) => catalogRequestSchema.parse(data))
  .handler(async ({ data }): Promise<CatalogRenderPayload> => {
    const { assertCatalogAllowed } = await import("../rate-limit.server");
    assertCatalogAllowed();

    const { selectComponent, renderComponent } = await import("./catalog.server");
    const selection = await selectComponent(data.requirement);
    const merged: Record<string, string> = {
      ...selection.variables,
      ...data.variables,
    };
    const { html, missing } = renderComponent(selection.entry, merged);
    return {
      componentId: selection.entry.id,
      name: selection.entry.name,
      category: selection.entry.category,
      framework: selection.entry.framework,
      reason: selection.reason,
      isFallback: selection.isFallback,
      missing,
      html,
    };
  });
