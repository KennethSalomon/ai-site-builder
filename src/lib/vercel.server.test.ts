import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { canDeployToVercel, deployToVercel, vercelSlug } from "./vercel.server";

const HTML = "<!doctype html><html><head><title>t</title></head><body>Bonjour monde</body></html>";

/** Simulation de l'API Vercel pour des tests hermétiques (aucun réseau). */
type ApiHandler<T> = (arg: T) => { status: number; json: unknown } | void;
type ApiResult = { status: number; json: unknown };

function stubApi(handlers: {
  create?: ApiHandler<unknown>;
  getDeployment?: (id: string) => ApiResult | void;
}): void {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "POST" && url.includes("/v13/deployments")) {
      const body = JSON.parse(String(init?.body));
      const res = (handlers.create?.(body) ?? { status: 200, json: { id: "dpl_1" } }) as ApiResult;
      return new Response(JSON.stringify(res.json), { status: res.status });
    }
    if (method === "GET" && url.includes("/v13/deployments/")) {
      const id = url.split("/").pop()!;
      const res = (handlers.getDeployment?.(id) ?? {
        status: 200,
        json: { readyState: "READY" },
      }) as ApiResult;
      return new Response(JSON.stringify(res.json), { status: res.status });
    }
    return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("vercelSlug", () => {
  it("construit un nom de projet préfixé guardsite, safe pour Vercel", () => {
    expect(vercelSlug("Le Comptoir de Julie")).toBe("guardsite-le-comptoir-de-julie");
    expect(vercelSlug("Café Étoile !!")).toBe("guardsite-cafe-etoile");
  });
});

describe("deployToVercel", () => {
  let savedToken: string | undefined;

  beforeAll(() => {
    savedToken = process.env["VERCEL_TOKEN"];
    process.env["VERCEL_TOKEN"] = "test-token";
  });
  afterAll(() => {
    if (savedToken !== undefined) process.env["VERCEL_TOKEN"] = savedToken;
    else delete process.env["VERCEL_TOKEN"];
  });
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("réclame un jeton Vercel avant tout appel (erreur explicite)", async () => {
    delete process.env["VERCEL_TOKEN"];
    try {
      await expect(deployToVercel("Site", HTML)).rejects.toMatchObject({
        name: "VercelDeployError",
        code: "VERCEL_TOKEN_MISSING",
      });
    } finally {
      process.env["VERCEL_TOKEN"] = "test-token";
    }
  });

  it("déploie le HTML statique et retourne l'URL stable du projet", async () => {
    const bodies: Array<{ name?: string; files?: Array<{ file?: string }> }> = [];
    stubApi({
      create: (body) => {
        bodies.push(body as never);
      },
    });

    const deployment = await deployToVercel("Comptoir de Julie", HTML);
    expect(bodies[0]?.name).toBe("guardsite-comptoir-de-julie");
    expect(bodies[0]?.files?.[0]).toMatchObject({ file: "index.html" });
    expect(deployment.url).toBe("https://guardsite-comptoir-de-julie.vercel.app");
    expect(deployment.slug).toBe("guardsite-comptoir-de-julie");
    expect(deployment.deployedAt).toBeTruthy();
  });

  it("rejette un contenu non-HTML et un HTML trop court", async () => {
    await expect(deployToVercel("X", "<p>court</p>")).rejects.toMatchObject({
      code: "INVALID_HTML",
    });
    await expect(deployToVercel("X", "<html>sans doctype</html>")).rejects.toBeInstanceOf(Error);
  });

  it("attend le passage à READY avant de publier l'URL", async () => {
    let polls = 0;
    stubApi({
      getDeployment: () => {
        polls += 1;
        return { status: 200, json: { readyState: polls >= 3 ? "READY" : "BUILDING" } };
      },
    });
    const deployment = await deployToVercel("Site", HTML);
    expect(polls).toBe(3);
    expect(deployment.url).toBe("https://guardsite-site.vercel.app");
  });

  it("rejette un échec réseau de l'API Vercel de façon explicite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network error");
      }),
    );
    await expect(deployToVercel("Site", HTML)).rejects.toMatchObject({
      name: "VercelDeployError",
      code: "NETWORK_ERROR",
    });
  });

  it("réessaie avec un suffixe si le nom de projet est déjà pris (409)", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(init?.method).toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ readyState: "READY" }), { status: 200 });
      }
      if (String(input).includes("/v13/deployments") && calls++ === 0) {
        return new Response(
          JSON.stringify({ error: { code: "already-used", message: "already used" } }),
          { status: 409 },
        );
      }
      return new Response(JSON.stringify({ id: "dpl_2", readyState: "READY" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const deployment = await deployToVercel("Comptoir de Julie", HTML);
    expect(calls).toBe(2);
    expect(deployment.url).toMatch(
      /^https:\/\/guardsite-comptoir-de-julie-[a-z0-9]{4}\.vercel\.app$/,
    );
  });

  it("réutilise le nom de projet existant au re-déploiement (URL stable)", async () => {
    const names: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(init?.method).toUpperCase() === "POST") {
        names.push(JSON.parse(String(init?.body)).name);
      }
      return new Response(JSON.stringify({ id: "dpl_3", readyState: "READY" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const deployment = await deployToVercel("Site", HTML, "guardsite-comptoir-de-julie-abc12");
    expect(names[0]).toBe("guardsite-comptoir-de-julie-abc12");
    expect(deployment.slug).toBe("guardsite-comptoir-de-julie-abc12");
    expect(deployment.url).toBe("https://guardsite-comptoir-de-julie-abc12.vercel.app");
  });
});

describe("canDeployToVercel", () => {
  it("indique si le déploiement est réalisable selon le jeton présent", () => {
    delete process.env["VERCEL_TOKEN"];
    expect(canDeployToVercel()).toBe(false);
    process.env["VERCEL_TOKEN"] = "x";
    expect(canDeployToVercel()).toBe(true);
  });
});
