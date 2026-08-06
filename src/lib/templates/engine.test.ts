import { describe, expect, it } from "vitest";
import { buildSite, escapeHtml, normalizeSocialLink } from "./engine";
import { resolveDesign } from "../design/design-language";
import type { Brief, MatchResult } from "../brief";

const brief: Brief = {
  siteName: "Le Comptoir de Julie",
  sector: "Alimentation",
  description:
    "Restaurant familial du centre-ville, produits frais et saisonniers, cuisine traditionnelle.",
  palette: "violet",
  hasLogo: false,
  socials: { instagram: "@julie", facebook: "https://facebook.com/lecomptoir" },
  articles: [
    { title: "Menu du soir", description: "Formule entrée + plat + dessert à 24 €." },
    { title: "Produits fermiers", description: "Viande et légumes chez nos voisins producteurs." },
  ],
  chatbot: true,
};

const result: MatchResult = {
  templateId: "gourmet-01",
  templateName: "Gourmet Table",
  reason: "Secteur Alimentation",
  content: {
    tagline: "Votre référence du goût",
    about: "Restaurant chaleureux, du champ à l'assiette.",
    sections: [
      { key: "menu", heading: "La carte", body: "Découvrez nos plats de saison." },
      { key: "gallery", heading: "Galerie", body: "Nos assiettes en images." },
    ],
    cta: "Réserver une table",
  },
};

describe("escapeHtml", () => {
  it("échappe les balises et les guillemets (anti-XSS)", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("échappe les apostrophes", () => {
    expect(escapeHtml(`l'apostrophe`)).toBe("l&#39;apostrophe");
  });
});

describe("normalizeSocialLink", () => {
  it("rejette les protocoles dangereux (javascript:)", () => {
    expect(normalizeSocialLink("instagram", "javascript:alert(1)")).toBeNull();
  });

  it("transforme un pseudo Instagram en profil officiel", () => {
    expect(normalizeSocialLink("instagram", "@julie")).toBe("https://instagram.com/julie");
    expect(normalizeSocialLink("instagram", "julie.mode_1")).toBe(
      "https://instagram.com/julie.mode_1",
    );
  });

  it("transforme un pseudo Facebook en profil officiel", () => {
    expect(normalizeSocialLink("facebook", "@lacompta")).toBe("https://facebook.com/lacompta");
  });

  it("convertit un numéro WhatsApp en lien wa.me", () => {
    expect(normalizeSocialLink("whatsapp", "+229 97 00 00 00")).toBe("https://wa.me/22997000000");
    expect(normalizeSocialLink("whatsapp", "+22997000000")).toBe("https://wa.me/22997000000");
  });

  it("laisse une URL WhatsApp complète inchangée", () => {
    expect(normalizeSocialLink("whatsapp", "https://wa.me/22997000000")).toBe(
      "https://wa.me/22997000000",
    );
  });

  it("accepte une URL https valide", () => {
    expect(normalizeSocialLink("facebook", "https://facebook.com/lecomptoir")).toBe(
      "https://facebook.com/lecomptoir",
    );
  });

  it("rejette un e-mail invalide", () => {
    expect(normalizeSocialLink("email", "pas un email")).toBeNull();
    expect(normalizeSocialLink("email", "a@b")).toBeNull();
  });

  it("accepte un e-mail valide en mailto", () => {
    expect(normalizeSocialLink("email", "contact@exemple.fr")).toBe("mailto:contact@exemple.fr");
  });

  it("rejette une valeur vide", () => {
    expect(normalizeSocialLink("instagram", "   ")).toBeNull();
  });
});

describe("buildSite", () => {
  it("génère un document HTML complet et autonome", () => {
    const html = buildSite(brief, result);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Votre référence du goût");
    expect(html).not.toContain("{{SITE_NAME}}");
    expect(html).not.toContain("{{TAGLINE}}");
  });

  it("injecte des métadonnées Open Graph (contenus échappés) dans le head", () => {
    const html = buildSite(brief, result);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:type"');
    expect(html).toContain("Le Comptoir de Julie");
    expect(html).not.toContain('og:title" content="<');
  });

  it("injecte les contenus IA dans les sections", () => {
    const html = buildSite(brief, result);
    expect(html).toContain("La carte");
    expect(html).toContain("Découvrez nos plats de saison.");
  });

  it("rend la palette choisie", () => {
    const html = buildSite(brief, result);
    expect(html).toContain("#7c3aed"); // violet.primary
  });

  it("échappe le contenu utilisateur injecté (anti-XSS de bout en bout)", () => {
    const evil: Brief = {
      ...brief,
      siteName: `<img src=x onerror=alert(1)>`,
      socials: { instagram: "javascript:alert(1)" },
      articles: [{ title: `<b>ok</b>`, description: `<script>alert(2)</script>` }],
    };
    const html = buildSite(evil, result);
    expect(html).not.toContain("<img src=x onerror=");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("javascript:alert");
  });

  it("rend la grille d'articles quand le brief en fournit", () => {
    const html = buildSite(brief, result);
    expect(html).toContain('data-section="articles"');
    expect(html).toContain("Menu du soir");
    expect(html).toContain("Produits fermiers");
  });

  it("n'affiche pas d'articles quand le brief n'en fournit pas", () => {
    const html = buildSite({ ...brief, articles: [] }, result);
    expect(html).not.toContain('data-section="articles"');
  });

  it("rend l'image d'un article quand c'est une URL sûre", () => {
    const html = buildSite(
      {
        ...brief,
        articles: [{ title: "A", description: "d", image: "https://cdn.example.com/plat.jpg" }],
      },
      result,
    );
    expect(html).toContain('src="https://cdn.example.com/plat.jpg"');
  });

  it("rejette une image dangereuse (javascript:) et retombe sur le dégradé", () => {
    const html = buildSite(
      {
        ...brief,
        articles: [{ title: "A", description: "d", image: "javascript:alert(1)" }],
      },
      result,
    );
    expect(html).not.toContain("javascript:alert");
    expect(html).toContain('class="gs-card-cover"');
  });

  it("active le chatbot uniquement si demandé", () => {
    expect(buildSite(brief, result)).toContain("data-gs-chat-toggle");
    expect(buildSite({ ...brief, chatbot: false }, result)).not.toContain("data-gs-chat-toggle");
  });

  it("rend les liens sociaux valides et ignore les invalides", () => {
    const html = buildSite(brief, result);
    expect(html).toContain("https://facebook.com/lecomptoir");
  });

  it("retombe sur la première palette si l'id est inconnu", () => {
    const html = buildSite({ ...brief, palette: "inconnu" }, result);
    expect(html).toContain("#7c3aed");
  });

  it("applique le thème design du résultat (couleurs, polices, effets)", () => {
    const themed: MatchResult = {
      ...result,
      design: {
        themeId: "tech-dark",
        themeName: "Tech Dark",
        genre: "atmospheric",
        accent: "#22D3EE",
        accentSoft: "#155E75",
        darkBg: "#060B14",
        darkSurface: true,
        displayFont: "Space Grotesk",
        bodyFont: "Inter",
        radius: 12,
        effects: ".gs-hero h1 { text-shadow: 0 0 22px var(--primary); }",
        source: "llm",
      },
    };
    const html = buildSite(brief, themed);
    expect(html).toContain("#22D3EE");
    expect(html).toContain("#060B14");
    expect(html).toContain("fonts.googleapis.com/css2?family=Space+Grotesk");
    expect(html).toContain("--font-display: 'Space Grotesk'");
    expect(html).toContain("--font-body: 'Inter'");
    expect(html).toContain("--radius: 12px");
    expect(html).toContain("text-shadow: 0 0 22px var(--primary)");
  });

  it("applique la surface sombre du thème (texte et cartes inversés)", () => {
    const themed: MatchResult = {
      ...result,
      design: {
        themeId: "retro-neon",
        themeName: "Retro Neon",
        genre: "atmospheric",
        accent: "#FF006E",
        accentSoft: "#00FFFF",
        darkBg: "#12122B",
        darkSurface: true,
        displayFont: "Orbitron",
        bodyFont: "Space Grotesk",
        radius: 0,
        effects: "",
        source: "llm",
      },
    };
    const html = buildSite(brief, themed);
    expect(html).toContain("background: var(--bg); color: var(--ink);");
    expect(html).toContain("--card: #15171c");
    expect(html).toContain("fonts.googleapis.com/css2?family=Orbitron");
  });

  it("résout un design fallback par secteur quand le résultat n'en porte pas", () => {
    const html = buildSite(brief, result);
    expect(html).toContain("fonts.googleapis.com"); // bistro-chic (secteur Alimentation)
    expect(html).toContain("--font-display: 'Fraunces'");
  });

  it("neutralise un design invalide (hex mal formé, police hors liste)", () => {
    const tokens = resolveDesign(
      { theme: "bistro-chic", accent: "rouge", displayFont: "Comic Sans MS", bodyFont: "Papyrus" },
      brief,
    );
    expect(tokens.accent).toBe("#C2410C"); // accent du thème, hex invalide ignoré
    expect(tokens.displayFont).toBe("Fraunces");
    expect(tokens.bodyFont).toBe("Inter");
    expect(tokens.source).toBe("llm");
    const html = buildSite(brief, { ...result, design: tokens });
    expect(html).not.toContain("Comic Sans");
    expect(html).not.toContain("Papyrus");
    expect(html).toContain("--font-display: 'Fraunces'");
  });

  it("échappe le nom du site dans le titre et le brand", () => {
    const html = buildSite({ ...brief, siteName: `Julie & Fils` }, result);
    expect(html).toContain("Julie &amp; Fils");
  });

  it("rend un monogramme quand hasLogo est vrai, rien sinon", () => {
    const withLogo = buildSite({ ...brief, hasLogo: true }, result);
    expect(withLogo).toContain('class="gs-logo"');
    expect(withLogo).toContain("L"); // Le Comptoir de Julie
    const withoutLogo = buildSite({ ...brief, hasLogo: false }, result);
    expect(withoutLogo).not.toContain('class="gs-logo"');
  });

  it("rend le logo uploadé (data URL image sûre)", () => {
    const html = buildSite(
      { ...brief, hasLogo: true, logoDataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      result,
    );
    expect(html).toContain('<img class="gs-logo');
    expect(html).toContain("data:image/png;base64,iVBORw0KGgo=");
  });

  it("rejette un logo non-image et retombe sur le monogramme", () => {
    const html = buildSite({ ...brief, hasLogo: true, logoDataUrl: "javascript:alert(1)" }, result);
    expect(html).not.toContain("javascript:alert");
    expect(html).not.toContain("<img");
    expect(html).toContain('class="gs-logo"'); // monogramme de repli
  });

  it("cible l'e-mail du brief dans le bouton du chatbot", () => {
    const html = buildSite(
      { ...brief, chatbot: true, socials: { email: "contact@comptoir.fr" } },
      result,
    );
    expect(html).toContain("data-gs-chat-mail");
    expect(html).toContain("mailto:contact@comptoir.fr");
  });

  it("masque le bouton e-mail du chatbot sans adresse valide", () => {
    const html = buildSite({ ...brief, chatbot: true, socials: {} }, result);
    expect(html).toContain("data-gs-chat-toggle");
    expect(html).not.toContain("data-gs-chat-mail");
  });

  it("rejette un e-mail dangereux dans le chatbot (fracture de balise)", () => {
    const evil = buildSite(
      { ...brief, chatbot: true, socials: { email: "a</script><script>x</script>@b.fr" } },
      result,
    );
    expect(evil).not.toContain("</script><script>");
    expect(evil).not.toContain("data-gs-chat-mail");
  });
});
