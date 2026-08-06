import { describe, expect, it } from "vitest";
import { fromCrossJSON, toJSONAsync } from "seroval";

/**
 * Test de bout en bout (serveur dev allumé) :
 * brief -> génération Gemini -> publication Vercel -> site servi.
 *
 * À lancer explicitement via `vitest.e2e.config.ts` (hors périmètre de `npm test`).
 */
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8081";

const brief = {
  siteName: "Le Comptoir de Julie",
  sector: "Alimentation",
  description:
    "Café-restaurant familial en centre-ville, cuisine française de saison, terrasse ensoleillée, produits locaux et desserts maison. Idéal pour déjeuner d'affaires ou brunch le week-end.",
  palette: "violet",
  hasLogo: false,
  socials: {
    facebook: "lecomptoirdejulie",
    instagram: "@lecomptoirdejulie",
    whatsapp: "+33612345678",
    email: "contact@lecomptoirdejulie.fr",
  },
  articles: [
    {
      title: "Brunch du dimanche",
      description:
        "Assortiment de viennoiseries, œufs bénédictine et jus pressés maison, de 10h à 15h.",
    },
    {
      title: "Formule déjeuner",
      description: "Entrée, plat et dessert du marché pour 19 €, service du lundi au vendredi.",
    },
    {
      title: "Tarte Tatin signature",
      description: "La recette de famille, caramel beurre salé, servie tiède avec crème fraîche.",
    },
  ],
  chatbot: true,
};

async function serverReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function getFunctionId(modulePath: string): Promise<string> {
  // Prod (worker buildé) : ids = hashes serveur, extractibles des chunks
  // générés — on laisse le .env les fournir. Dev : l'id est un base64 JSON
  // lisible dans le module source servi par Vite.
  const override = new Map([
    ["/src/lib/generation.functions.ts", process.env.E2E_GENERATE_FN_ID],
    ["/src/lib/deploy.functions.ts", process.env.E2E_DEPLOY_FN_ID],
  ]);
  const fromEnv = override.get(modulePath);
  if (fromEnv) return fromEnv;

  const res = await fetch(`${BASE}${modulePath}`);
  if (!res.ok) throw new Error(`module introuvable (${res.status}) : ${modulePath}`);
  const code = await res.text();
  const match = code.match(/createClientRpc\(\s*['"]([^'"]+)['"]\)/);
  if (!match) throw new Error(`functionId introuvable dans ${modulePath}`);
  return match[1];
}

async function callServerFn<T>(fnId: string, data: unknown): Promise<T> {
  const serialized = JSON.stringify(await toJSONAsync({ data }, { plugins: [] }));
  const res = await fetch(`${BASE}/_serverFn/${fnId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tsr-serverFn": "true",
      "Sec-Fetch-Site": "same-origin",
      Referer: `${BASE}/`,
    },
    body: serialized,
    signal: AbortSignal.timeout(90_000),
  });
  const raw = await res.text();
  if (!res.ok) {
    const msg = raw.match(/"s":"([^"]+)"/)?.[1] ?? raw.slice(0, 200);
    throw new Error(`serverFn KO (${res.status}): ${msg}`);
  }
  const decoded = fromCrossJSON(JSON.parse(raw), { plugins: [] }) as {
    result: T;
    error: unknown;
  };
  if (decoded.error) {
    throw new Error(`serverFn KO: ${JSON.stringify(decoded.error).slice(0, 200)}`);
  }
  return decoded.result;
}

/**
 * Appelle une server function sans déserialiser la réponse : retourne le texte
 * brut. Utile pour les erreurs serveur (jeton Vercel absent, etc.) dont l'objet
 * Error sérialisé n'est pas lisible par seroval hors d'un client TanStack.
 */
async function callServerFnRaw(
  fnId: string,
  data: unknown,
): Promise<{ ok: boolean; status: number; raw: string }> {
  const serialized = JSON.stringify(await toJSONAsync({ data }, { plugins: [] }));
  const res = await fetch(`${BASE}/_serverFn/${fnId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tsr-serverFn": "true",
      "Sec-Fetch-Site": "same-origin",
      Referer: `${BASE}/`,
    },
    body: serialized,
    signal: AbortSignal.timeout(90_000),
  });
  return { ok: res.ok, status: res.status, raw: await res.text() };
}

type GenerationPayload = {
  result?: {
    templateId: string;
    templateName: string;
    isFallback: boolean;
    content: { tagline: string };
  };
  siteHtml: string;
};
type DeployPayload = { url: string; slug: string; deployedAt: string };

const describeOrSkip = (await serverReachable()) ? describe : describe.skip;

describeOrSkip("flux de bout en bout (serveur dev actif)", () => {
  it(
    "génère le site avec Gemini puis le publie sur Vercel (URL stable au re-déploiement)",
    { timeout: 180_000 },
    async () => {
      const genFn = await getFunctionId("/src/lib/generation.functions.ts");
      const depFn = await getFunctionId("/src/lib/deploy.functions.ts");

      const t0 = Date.now();
      const payload = await callServerFn<GenerationPayload>(genFn, brief);
      const generationMs = Date.now() - t0;
      console.log(
        `generation: ${generationMs} ms | fallback: ${payload.result?.isFallback ?? "?"} | template: ${payload.result?.templateName}`,
      );

      expect(payload.siteHtml.length).toBeGreaterThan(1_000);
      expect(payload.siteHtml).toMatch(/<!doctype html>/i);
      expect(payload.result?.isFallback).toBe(false);
      expect(payload.result?.content.tagline.length).toBeGreaterThan(5);

      // Publication réelle : exercée si le serveur dispose d'un jeton Vercel,
      // ignorée proprement sinon (l'e2e reste verte en CI sans token).
      let deploy: DeployPayload | null = null;
      let deployMs = 0;
      try {
        const t1 = Date.now();
        const res = await callServerFnRaw(depFn, {
          id: "e2e-comptoir",
          siteName: brief.siteName,
          html: payload.siteHtml,
        });
        if (!res.ok || /VERCEL_TOKEN|n'est pas configur/i.test(res.raw)) {
          console.log("publication: ignorée (aucun VERCEL_TOKEN configuré côté serveur)");
        } else {
          const decoded = fromCrossJSON(JSON.parse(res.raw), { plugins: [] }) as {
            result: DeployPayload;
          };
          deploy = decoded.result;
          deployMs = Date.now() - t1;
          console.log(`publication: ${deployMs} ms | url: ${deploy.url}`);
          expect(deploy.url).toMatch(/^https:\/\/[a-z0-9-]+\.vercel\.app$/);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("VERCEL_TOKEN")) {
          console.log("publication: ignorée (aucun VERCEL_TOKEN configuré côté serveur)");
        } else {
          throw err;
        }
      }

      if (deploy) {
        const siteRes = await fetch(deploy.url, { signal: AbortSignal.timeout(15_000) });
        const body = await siteRes.text();
        expect(siteRes.status).toBe(200);
        expect(body).toContain("Le Comptoir");
        expect(body).toContain(payload.result!.content.tagline);

        const t2 = Date.now();
        const redeploy = await callServerFn<DeployPayload>(depFn, {
          id: "e2e-comptoir",
          siteName: brief.siteName,
          html: payload.siteHtml,
          slug: deploy.slug,
        });
        const redeployMs = Date.now() - t2;
        console.log(
          `re-publication: ${redeployMs} ms | url identique: ${redeploy.url === deploy.url}`,
        );
        expect(redeploy.url).toBe(deploy.url);

        console.log(`total brief -> site public: ${generationMs + deployMs} ms`);
      }
    },
  );
});
