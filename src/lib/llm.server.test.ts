import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let geminiCalls = 0;
let geminiBehavior:
  { kind: "ok" } | { kind: "always-fail"; message: string } | { kind: "fail-once-then-ok" } = {
  kind: "ok",
};

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => {
        geminiCalls++;
        if (geminiBehavior.kind === "always-fail") {
          throw new Error(geminiBehavior.message);
        }
        if (geminiBehavior.kind === "fail-once-then-ok" && geminiCalls === 1) {
          throw new Error("Quota exceeded: 429 RESOURCE_EXHAUSTED");
        }
        return { text: '{"tagline": "ça marche"}' };
      },
    };
  },
}));

import { generateJson, lastAiFailureReason, hasAiProvider } from "./llm.server";

const KEY = { GEMINI_API_KEY: "test-key" };

describe("llm.server (moteur IA)", () => {
  beforeEach(() => {
    vi.resetModules();
    geminiCalls = 0;
    geminiBehavior = { kind: "ok" };
  });

  afterEach(() => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["LLM_PROVIDER"];
    delete process.env["XAI_API_KEY"];
    vi.resetModules();
  });

  it("détecte un provider quand une clé Gemini est présente", () => {
    process.env["GEMINI_API_KEY"] = KEY.GEMINI_API_KEY;
    expect(hasAiProvider()).toBe(true);
  });

  it("retourne null sans aucune clé IA (fallback déterministe côté appelant)", async () => {
    const result = await generateJson("système", "utilisateur");
    expect(result).toBeNull();
    expect(lastAiFailureReason()).toMatch(/aucune clé/i);
  });

  it("génère le JSON demandé quand Gemini répond", async () => {
    process.env["GEMINI_API_KEY"] = KEY.GEMINI_API_KEY;
    const result = await generateJson("système", "utilisateur");
    expect(result).toContain('"tagline"');
    expect(lastAiFailureReason()).toBeNull();
    expect(geminiCalls).toBe(1);
  });

  it("rejoue après une erreur transitoire 429 puis réussit (backoff)", async () => {
    geminiBehavior = { kind: "fail-once-then-ok" };
    process.env["GEMINI_API_KEY"] = KEY.GEMINI_API_KEY;
    const result = await generateJson("système", "utilisateur");
    expect(result).toContain('"tagline"');
    expect(geminiCalls).toBe(2);
    expect(lastAiFailureReason()).toBeNull();
  });

  it("abandonne après une erreur permanente et expose la raison", async () => {
    geminiBehavior = { kind: "always-fail", message: "API key not valid: 400 INVALID_ARGUMENT" };
    process.env["GEMINI_API_KEY"] = KEY.GEMINI_API_KEY;
    const result = await generateJson("système", "utilisateur");
    expect(result).toBeNull();
    expect(geminiCalls).toBe(1); // erreur non transitoire → aucune reprise
    expect(lastAiFailureReason()).toContain("400");
  });
});
