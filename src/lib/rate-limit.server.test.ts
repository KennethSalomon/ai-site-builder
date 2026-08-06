import { afterEach, describe, expect, it, vi } from "vitest";
import { consume, _resetRateLimitsForTests, isValidSessionId } from "./rate-limit.server";
import { slugify, siteExportFilename } from "./deploy.functions";

afterEach(() => {
  _resetRateLimitsForTests();
  vi.useRealTimers();
});

describe("rate limiter (fenêtre glissante)", () => {
  it("autorise jusqu'au quota puis bloque", () => {
    expect(consume("ip:1", 3)).toBe(true);
    expect(consume("ip:1", 3)).toBe(true);
    expect(consume("ip:1", 3)).toBe(true);
    expect(consume("ip:1", 3)).toBe(false);
  });

  it("les fenêtres sont indépendantes par clé", () => {
    expect(consume("ip:a", 1)).toBe(true);
    expect(consume("ip:a", 1)).toBe(false);
    expect(consume("ip:b", 1)).toBe(true);
  });

  it("débloque après expiration de la fenêtre", () => {
    vi.useFakeTimers();
    expect(consume("ip:1", 1, 1000)).toBe(true);
    expect(consume("ip:1", 1, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(consume("ip:1", 1, 1000)).toBe(true);
  });
});

describe("slugify (déploiement)", () => {
  it("minimise et découpe en tirets", () => {
    expect(slugify("Le Comptoir de Julie")).toBe("le-comptoir-de-julie");
  });

  it("normalise les accents", () => {
    expect(slugify("Café Élégant")).toBe("cafe-elegant");
  });

  it("borne à 32 caractères", () => {
    expect(slugify("a".repeat(80))).toHaveLength(32);
  });

  it("retombe sur 'site' si vide", () => {
    expect(slugify("   ")).toBe("site");
  });
});

describe("session de rate-limit (cookie signé)", () => {
  it("rejette un identifiant absent", () => {
    expect(isValidSessionId(undefined)).toBe(false);
  });

  it("rejette un identifiant forgé sans signature", () => {
    expect(isValidSessionId("just-a-token")).toBe(false);
  });

  it("rejette une signature altérée", () => {
    expect(isValidSessionId("abc.deadbeef")).toBe(false);
  });

  it("rejette une signature de mauvaise longueur", () => {
    expect(isValidSessionId("abc.123")).toBe(false);
  });
});

describe("export du site (déploiement)", () => {
  it("produit un nom de fichier html slugifié", () => {
    expect(siteExportFilename("Le Comptoir de Julie")).toBe("le-comptoir-de-julie.html");
  });
});
