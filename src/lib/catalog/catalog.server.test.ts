import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  loadCatalog,
  getCatalog,
  findComponent,
  injectVariables,
  renderComponent,
  searchComponents,
  normalizeSelection,
  selectComponent,
  _resetCatalogForTests,
} from "./catalog.server";

describe("catalogue (templates.json)", () => {
  it("charge et valide tous les composants du fichier", () => {
    const catalog = loadCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    const ids = catalog.map((c) => c.id);
    expect(new Set(ids).size).toBe(catalog.length);
  });

  it("chaque composant expose des variables attendues", () => {
    for (const c of getCatalog()) {
      expect(Array.isArray(c.variables_attendues)).toBe(true);
      expect(c.html_code.length).toBeGreaterThan(0);
    }
  });

  it("findComponent retrouve un composant par id", () => {
    expect(findComponent("metric-card")?.name).toBe("Carte métrique");
    expect(findComponent("nope")).toBeUndefined();
  });
});

describe("injection dynamique (anti-XSS)", () => {
  it("échappe les valeurs utilisateur", () => {
    const { html } = injectVariables("<p>{{TITLE}}</p>", { title: `<script>alert("x")</script>` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("supprime les jetons non attendus (aucun résidu)", () => {
    const { html } = injectVariables("<p>{{TITLE}} {{HACKED}}</p>", { title: "ok" });
    expect(html).toBe("<p>ok </p>");
  });

  it("ignore les variables inconnues", () => {
    const { html } = injectVariables("<p>{{TITLE}}</p>", { title: "t", autre: "x" });
    expect(html).toBe("<p>t</p>");
  });

  it("liste les variables attendues manquantes", () => {
    const { html, missing } = injectVariables("<p>{{A}} {{B}}</p>", { a: "1" });
    expect(html).toBe("<p>1 </p>");
    expect(missing).toContain("b");
  });

  it("transforme features_list en bloc de lignes", () => {
    const { html } = injectVariables("<ul>{{FEATURES_LIST}}</ul>", { features_list: "A ; B ; C" });
    expect(html).toContain("<li");
    expect(html).toContain("A");
  });

  it("renderComponent limite l'injection aux variables_attendues", () => {
    const entry = findComponent("metric-card")!;
    const { html } = renderComponent(entry, {
      title: "CA",
      metric_value: "1 240 000",
      status: "+12%",
      status_class: "bg-emerald-100",
      delta: "vs mois dernier",
    });
    expect(html).toContain("CA");
    expect(html).toContain("1 240 000");
    expect(html).toContain("bg-emerald-100");
    expect(html).not.toContain("{{");
  });
});

describe("recherche déterministe", () => {
  it("retrouve un formulaire de contact", () => {
    const results = searchComponents("formulaire contact agence");
    expect(results[0]?.id).toBe("contact-form");
  });

  it("retrouve une carte produit", () => {
    const results = searchComponents("produit boutique catalogue");
    expect(results[0]?.id).toBe("product-card");
  });

  it("retourne un fallback catalogue si aucun mot-clé ne matche", () => {
    const results = searchComponents("zzz inconnu qwx");
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

describe("normalizeSelection (validation de la sortie LLM)", () => {
  it("accepte une réponse JSON valide", () => {
    const raw = JSON.stringify({
      componentId: "metric-card",
      reason: "Métrique demandée",
      variables: { title: "CA", metric_value: "10" },
    });
    const sel = normalizeSelection(raw);
    expect(sel).not.toBeNull();
    expect(sel!.componentId).toBe("metric-card");
  });

  it("rejette un JSON invalide", () => {
    expect(normalizeSelection("{ nope")).toBeNull();
  });

  it("rejette un componentId inconnu", () => {
    const raw = JSON.stringify({
      componentId: "ghost-99",
      reason: "r",
      variables: {},
    });
    expect(normalizeSelection(raw)).toBeNull();
  });
});

describe("sélection avec bascule déterministe (sans clé IA)", () => {
  let savedXaiKey: string | undefined;
  let savedGeminiKey: string | undefined;

  beforeAll(() => {
    savedXaiKey = process.env["XAI_API_KEY"];
    savedGeminiKey = process.env["GEMINI_API_KEY"];
    delete process.env["XAI_API_KEY"];
    delete process.env["GEMINI_API_KEY"];
    delete process.env["LLM_PROVIDER"];
    _resetCatalogForTests();
  });

  afterAll(() => {
    if (savedXaiKey !== undefined) process.env["XAI_API_KEY"] = savedXaiKey;
    else delete process.env["XAI_API_KEY"];
    if (savedGeminiKey !== undefined) process.env["GEMINI_API_KEY"] = savedGeminiKey;
    else delete process.env["GEMINI_API_KEY"];
    _resetCatalogForTests();
  });

  it("bascule en déterministe et choisit le bon composant", async () => {
    const sel = await selectComponent("Carte métrique pour le chiffre d'affaires");
    expect(sel.isFallback).toBe(true);
    expect(sel.entry.id).toBe("metric-card");
  });

  it("ne casse jamais : retourne toujours un composant du catalogue", async () => {
    const sel = await selectComponent("besoin totalement flou qwxz");
    expect(sel.entry).toBeDefined();
    expect(sel.reason).toContain("déterministe");
  });
});
