import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { logger } from "./logger";

/**
 * Moteur IA GuardSite AI — abstraction multi-fournisseurs.
 *
 * Provider par défaut : **Gemini** (repli gratuit via Google AI Studio,
 * SDK `@google/genai`, clé `GEMINI_API_KEY`, modèle `gemini-2.5-flash`).
 * Alternative : **Grok (xAI)** via l'API OpenAI-compatible
 * (`https://api.x.ai/v1`, clé `XAI_API_KEY`).
 *
 * Sélection du provider :
 * - `LLM_PROVIDER` = `gemini`|`grok`|`xai` si explicitement positionné ;
 * - sinon, détection automatique par clé présente (donné en priorité à Gemini,
 *   le fournisseur au free tier le plus généreux) ;
 * - aucune clé → `generateJson` retourne `null` et les appelants basculent
 *   sur leur fallback déterministe ; la raison est exposée via
 *   `lastAiFailureReason()`.
 *
 * Modèle : `GEMINI_MODEL` (défaut `gemini-2.5-flash`) ou `LLM_MODEL`
 * (Grok, défaut `grok-3`). Endpoint xAI personnalisable via `XAI_ENDPOINT`.
 */

/** Garde-fou : on ne laisse jamais l'appel pendre (défaut réseau infini). */
const REQUEST_TIMEOUT_MS = 30_000;

const DEFAULT_MODELS: Record<"gemini" | "grok", string> = {
  gemini: "gemini-2.5-flash",
  grok: "grok-3",
};

const XAI_DEFAULT_ENDPOINT = "https://api.x.ai/v1/chat/completions";

type LlmProvider = "gemini" | "grok";

/** Dernière raison d'échec du moteur IA (clé absente, timeout, réponse vide…). */
let lastAiFailure: string | null = null;

export function lastAiFailureReason(): string | null {
  return lastAiFailure;
}

/** `true` si un provider IA est configuré (xAI ou Gemini). */
export function hasAiProvider(): boolean {
  return resolveProvider() !== null;
}

function resolveProvider(): LlmProvider | null {
  const explicit = process.env["LLM_PROVIDER"]?.trim().toLowerCase();
  if (explicit === "gemini") return "gemini";
  if (explicit === "grok" || explicit === "xai") return "grok";
  if (process.env["GEMINI_API_KEY"]) return "gemini";
  if (process.env["XAI_API_KEY"]) return "grok";
  return null;
}

function modelFor(provider: LlmProvider): string {
  if (provider === "grok") {
    return process.env["LLM_MODEL"] ?? DEFAULT_MODELS.grok;
  }
  return process.env["GEMINI_MODEL"] ?? DEFAULT_MODELS.gemini;
}

/**
 * Génère un contenu JSON auprès du moteur IA. En cas d'absence de clé,
 * d'erreur réseau, de refus ou de réponse vide, retourne `null` — les
 * appelants basculent alors sur leur fallback déterministe. La raison de
 * l'échec est consultable via `lastAiFailureReason()`.
 */
export async function generateJson(system: string, user: string): Promise<string | null> {
  lastAiFailure = null;
  const provider = resolveProvider();
  if (!provider) {
    lastAiFailure = "Aucune clé IA configurée (GEMINI_API_KEY ou XAI_API_KEY).";
    logger.warn(lastAiFailure);
    return null;
  }

  try {
    const text =
      provider === "grok"
        ? await generateWithGrok(system, user)
        : await generateWithGemini(system, user);
    if (!text.trim()) {
      throw new Error("Réponse vide du moteur IA.");
    }
    return text;
  } catch (err) {
    lastAiFailure = err instanceof Error ? err.message : String(err);
    logger.error(`Moteur IA ${provider} indisponible : ${lastAiFailure}`);
    return null;
  }
}

/** Appel Grok (xAI) — endpoint OpenAI-compatible, JSON imposé côté API. */
async function generateWithGrok(system: string, user: string): Promise<string> {
  const apiKey = process.env["XAI_API_KEY"]!;
  const endpoint = process.env["XAI_ENDPOINT"] ?? XAI_DEFAULT_ENDPOINT;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelFor("grok"),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Réponse HTTP xAI ${res.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Réponse vide de Grok.");
  return text;
}

/** Appel Gemini — SDK officiel Google AI Studio. */
async function generateWithGemini(system: string, user: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"]! });
  const res: GenerateContentResponse = await ai.models.generateContent({
    model: modelFor("gemini"),
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  });
  const text = (res as { text?: string }).text ?? "";
  if (!text.trim()) throw new Error("Réponse vide Gemini.");
  return text;
}
