import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { normalizeResult, matchTemplate } from "./matching.server";
import type { Brief } from "./brief";

const brief: Brief = {
  siteName: "Cabinet Dr Martin",
  sector: "Médecine",
  description: "Cabinet médical généraliste, prise de rendez-vous rapide.",
  palette: "ocean",
  hasLogo: false,
  socials: {},
  articles: [],
  chatbot: false,
};

describe("normalizeResult (validation de la sortie IA)", () => {
  it("accepte une réponse JSON valide et marque isFallback=false", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "Secteur médical",
      content: {
        tagline: "Votre santé, notre priorité",
        about: "Cabinet moderne et accessible.",
        sections: [{ key: "specialties", heading: "Spécialités", body: "Généraliste, pédiatrie." }],
        cta: "Prendre rendez-vous",
      },
    });
    const parsed = normalizeResult(raw, brief);
    expect(parsed).not.toBeNull();
    expect(parsed!.templateName).toBe("CareTrust");
    expect(parsed!.isFallback).toBe(false);
  });

  it("accepte une réponse enveloppée dans un bloc de code ```json", () => {
    const raw = `\`\`\`json
    ${JSON.stringify({
      templateId: "care-03",
      reason: "OK",
      content: {
        tagline: "t",
        about: "a",
        sections: [],
        cta: "c",
      },
    })}
    \`\`\``;
    const parsed = normalizeResult(raw, brief);
    expect(parsed).not.toBeNull();
    expect(parsed!.templateId).toBe("care-03");
  });

  it("rejette un JSON invalide", () => {
    expect(normalizeResult("{ pas du json", brief)).toBeNull();
  });

  it("rejette une réponse sans contenu", () => {
    expect(normalizeResult("", brief)).toBeNull();
    expect(normalizeResult("null", brief)).toBeNull();
  });

  it("rejette un templateId inconnu", () => {
    const raw = JSON.stringify({
      templateId: "nope-99",
      reason: "r",
      content: { tagline: "t", about: "a", sections: [], cta: "c" },
    });
    expect(normalizeResult(raw, brief)).toBeNull();
  });

  it("filtre les sections qui n'appartiennent pas au template retenu", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      content: {
        tagline: "t",
        about: "a",
        sections: [
          { key: "specialties", heading: "Spécialités", body: "b" },
          { key: "menu", heading: "Menu", body: "tentative d'injection" },
        ],
        cta: "c",
      },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.content.sections.map((s) => s.key)).toEqual(["specialties"]);
  });

  it("rejette les sections mal formées", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      content: { tagline: "t", about: "a", sections: [{ key: 42 }], cta: "c" },
    });
    expect(normalizeResult(raw, brief)).toBeNull();
  });

  it("borne le nombre de sections à 8", () => {
    const sections = Array.from({ length: 12 }, (_, i) => ({
      key: "specialties",
      heading: `h${i}`,
      body: "b",
    }));
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      content: { tagline: "t", about: "a", sections, cta: "c" },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.content.sections.length).toBe(8);
  });

  it("applique le thème design choisi par l'IA (accent et polices du thème)", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      design: { theme: "tech-dark" },
      content: { tagline: "t", about: "a", sections: [], cta: "c" },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.design).toMatchObject({
      themeId: "tech-dark",
      themeName: "Tech Dark",
      accent: "#22D3EE",
      displayFont: "Space Grotesk",
      darkSurface: true,
      source: "llm",
    });
  });

  it("accepte les overrides design valides de l'IA (hex et polices de la liste)", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      design: {
        theme: "clinical-clean",
        accent: "#0B7285",
        darkBg: "#02131A",
        displayFont: "Fraunces",
      },
      content: { tagline: "t", about: "a", sections: [], cta: "c" },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.design!.accent).toBe("#0B7285");
    expect(parsed.design!.darkBg).toBe("#02131A");
    expect(parsed.design!.displayFont).toBe("Fraunces");
    expect(parsed.design!.source).toBe("llm");
  });

  it("rejette un design invalide (thème inconnu, hex mal formé) et retombe sur le secteur", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      design: { theme: "nope-99", accent: "rouge", displayFont: "Comic Sans MS" },
      content: { tagline: "t", about: "a", sections: [], cta: "c" },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.design!.themeId).toBe("clinical-clean"); // secteur Médecine
    expect(parsed.design!.accent).toBe("#0ea5e9"); // palette ocean du brief
    expect(parsed.design!.displayFont).toBe("Inter");
    expect(parsed.design!.source).toBe("fallback");
  });

  it("résout le design par défaut quand l'IA n'en fournit pas (accent du brief conservé)", () => {
    const raw = JSON.stringify({
      templateId: "care-03",
      reason: "r",
      content: { tagline: "t", about: "a", sections: [], cta: "c" },
    });
    const parsed = normalizeResult(raw, brief)!;
    expect(parsed.design!.themeId).toBe("clinical-clean");
    expect(parsed.design!.accent).toBe("#0ea5e9");
    expect(parsed.design!.source).toBe("fallback");
  });
});

describe("fallback déterministe (IA indisponible)", () => {
  let savedXaiKey: string | undefined;
  let savedGeminiKey: string | undefined;

  beforeAll(() => {
    savedXaiKey = process.env["XAI_API_KEY"];
    savedGeminiKey = process.env["GEMINI_API_KEY"];
    delete process.env["XAI_API_KEY"];
    delete process.env["GEMINI_API_KEY"];
    delete process.env["LLM_PROVIDER"];
  });

  afterAll(() => {
    if (savedXaiKey !== undefined) process.env["XAI_API_KEY"] = savedXaiKey;
    else delete process.env["XAI_API_KEY"];
    if (savedGeminiKey !== undefined) process.env["GEMINI_API_KEY"] = savedGeminiKey;
    else delete process.env["GEMINI_API_KEY"];
  });

  it("marque isFallback, choisit le template du secteur et fournit une raison", async () => {
    const result = await matchTemplate(brief);
    expect(result.isFallback).toBe(true);
    expect(result.templateName).toBe("CareTrust"); // secteur Médecine
    expect(result.fallbackReason).toBeTruthy();
  });

  it("fournit un design déterministe par secteur (thème + accent du brief)", async () => {
    const result = await matchTemplate(brief);
    expect(result.design).toMatchObject({
      themeId: "clinical-clean", // secteur Médecine
      accent: "#0ea5e9", // palette ocean du brief
      source: "fallback",
    });
    expect(result.design!.displayFont).toBeTruthy();
  });

  it("diversifie les sections (plus de description répétée 4x)", async () => {
    const result = await matchTemplate(brief);
    const bodies = result.content.sections.map((s) => s.body);
    expect(new Set(bodies).size).toBeGreaterThan(1);
    expect(result.content.sections.some((s) => s.heading === "hero")).toBe(false);
  });

  it("utilise une tagline et un CTA contextualisés au secteur", async () => {
    const result = await matchTemplate(brief);
    expect(result.content.tagline).toContain("santé");
    expect(result.content.cta).toContain("rendez-vous");
  });

  it("injecte les vrais articles du brief dans les sections catalogue du fallback", async () => {
    const withArticles: Brief = {
      ...brief,
      articles: [
        { title: "Consultation générale", description: "45 min." },
        { title: "Bilan sanguin", description: "Sur ordonnance." },
      ],
    };
    const result = await matchTemplate(withArticles);
    expect(result.isFallback).toBe(true);
    const bodies = result.content.sections.map((s) => s.body);
    expect(
      bodies.some((b) => b.includes("Consultation générale") && b.includes("Bilan sanguin")),
    ).toBe(true);
  });
});
