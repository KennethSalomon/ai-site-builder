import { describe, expect, it } from "vitest";
import { briefSchema } from "./brief";

const base = {
  siteName: "Le Comptoir",
  sector: "Alimentation",
  description: "Restaurant familial, produits frais et de saison.",
  palette: "violet",
  hasLogo: false,
  socials: {},
  articles: [],
  chatbot: false,
};

describe("briefSchema (durcissement)", () => {
  it("accepte un brief valide", () => {
    expect(briefSchema.safeParse(base).success).toBe(true);
  });

  it("rejette plus de 10 articles (quota)", () => {
    const articles = Array.from({ length: 11 }, (_, i) => ({
      title: `Article ${i}`,
      description: "desc",
    }));
    const result = briefSchema.safeParse({ ...base, articles });
    expect(result.success).toBe(false);
    expect(briefSchema.safeParse({ ...base, articles: articles.slice(0, 10) }).success).toBe(true);
  });

  it("rejette un titre d'article trop long", () => {
    const result = briefSchema.safeParse({
      ...base,
      articles: [{ title: "x".repeat(121), description: "desc" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejette une URL de réseau social trop longue", () => {
    const result = briefSchema.safeParse({
      ...base,
      socials: { instagram: "i".repeat(301) },
    });
    expect(result.success).toBe(false);
  });

  it("rejette un nom de site vide ou trop long", () => {
    expect(briefSchema.safeParse({ ...base, siteName: "" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, siteName: "x".repeat(81) }).success).toBe(false);
  });

  it("rejette un secteur inconnu", () => {
    expect(briefSchema.safeParse({ ...base, sector: "Voyages" }).success).toBe(false);
  });

  it("rejette une description trop courte", () => {
    expect(briefSchema.safeParse({ ...base, description: "abc" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, description: "douze caractères" }).success).toBe(true);
  });

  it("rejette un logoDataUrl trop lourd (quota)", () => {
    expect(briefSchema.safeParse({ ...base, logoDataUrl: "x".repeat(450_001) }).success).toBe(
      false,
    );
    expect(
      briefSchema.safeParse({ ...base, logoDataUrl: "data:image/png;base64,AAAA" }).success,
    ).toBe(true);
  });
});
