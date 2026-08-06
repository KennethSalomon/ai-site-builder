import gourmetSource from "./templates/gourmet-01.html?raw";
import glowSource from "./templates/glow-02.html?raw";
import careSource from "./templates/care-03.html?raw";
import techgridSource from "./templates/techgrid-04.html?raw";
import corpoSource from "./templates/corpo-05.html?raw";

import { TEMPLATES, findTemplate } from "./registry";
import type { Brief, MatchResult } from "../brief";
import { FONT_STACKS, resolveDesign, type DesignTokens } from "../design/design-language";

/**
 * Sources HTML brutes des templates. Séparées du moteur pour que
 * buildSite reste pur et testable (le ?raw est résolu par Vite).
 */
export const TEMPLATE_SOURCES: Readonly<Record<string, string>> = {
  "gourmet-01": gourmetSource,
  "glow-02": glowSource,
  "care-03": careSource,
  "techgrid-04": techgridSource,
  "corpo-05": corpoSource,
};

export function getTemplateSource(templateId: string): string | undefined {
  return TEMPLATE_SOURCES[templateId];
}

/** Échappe tout texte utilisateur avant injection HTML (anti-XSS). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

const SAFE_URL_SCHEMES = new Set(["https:", "http:"]);

/** Raccourcis de profils officiels pour les pseudos courts. */
const SOCIAL_BASES: Record<string, string> = {
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",
};

/** Normalise et valide un lien social. Retourne `null` si non injectable. */
export function normalizeSocialLink(kind: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (kind === "email") {
    // Regex volontairement stricte : on refuse toute injection de protocole.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return null;
    return `mailto:${value}`;
  }

  if (kind === "whatsapp") {
    // Numéro local ou international (préfixe +, espaces, tirets, parenthèses) → wa.me
    const digits = value.replace(/[\s\-()./]/g, "").replace(/^\+/, "");
    if (/^\d{6,15}$/.test(digits)) return `https://wa.me/${digits}`;
  }

  // Pseudo court (@nom ou identifiant simple) → URL du profil officiel.
  const handle = value.replace(/^@+/, "");
  const base = SOCIAL_BASES[kind];
  if (base && /^[a-zA-Z0-9_.]{1,50}$/.test(handle)) {
    return `${base}${handle}`;
  }

  let url = value.replace(/^@+/, "");
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!SAFE_URL_SCHEMES.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Valide une URL d'image distante (http/https uniquement). `null` sinon. */
export function safeImageUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    return null;
  }
  return null;
}

/** Valide un logo uploadé encodé en data URL image. Strict : rejette tout script. */
export function safeLogoDataUrl(raw: string | undefined | null): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(raw)) return null;
  return raw;
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

function renderSections(result: MatchResult): string {
  if (!Array.isArray(result.content.sections)) return "";
  return result.content.sections
    .filter((s) => s && typeof s.key === "string" && s.key.length > 0)
    .map(
      (s) => `<section class="gs-section" data-section="${escapeHtml(s.key)}">
  <div class="gs-container">
    <h2 class="gs-heading">${escapeHtml(s.heading ?? "")}</h2>
    <p class="gs-body">${escapeHtml(s.body ?? "")}</p>
  </div>
</section>`,
    )
    .join("\n");
}

function renderArticles(brief: Brief): string {
  const articles = (brief.articles ?? []).filter(
    (a) => a && (a.title.trim() || a.description.trim()),
  );
  if (articles.length === 0) return "";
  const cards = articles
    .map((a) => {
      const title = a.title.trim() || "Sans titre";
      const cover = safeImageUrl(a.image);
      const coverHtml = cover
        ? `<div class="gs-card-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`
        : `<div class="gs-card-cover" role="img" aria-hidden="true"></div>`;
      return `<article class="gs-card">${coverHtml}
  <div class="gs-card-body">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(truncate(a.description.trim() || "—", 180))}</p>
  </div>
</article>`;
    })
    .join("\n");
  return `<section class="gs-section" data-section="articles">
  <div class="gs-container">
    <h2 class="gs-heading">Nos produits</h2>
    <div class="gs-grid">${cards}</div>
  </div>
</section>`;
}

function renderSocials(brief: Brief): string {
  const socials = (brief.socials ?? {}) as Record<string, string | undefined>;
  const links = Object.entries(socials)
    .filter(([k, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => {
      const href = normalizeSocialLink(k, v as string);
      if (!href) return null;
      const label = SOCIAL_LABELS[k] ?? k;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    })
    .filter((x): x is string => x !== null);

  if (links.length === 0) return "";
  return `<div class="gs-social">${links.join("")}</div>`;
}

/** E-mail validé, sûr pour un contexte JS : exclut tout caractère d'échappement HTML. */
function safeChatEmail(brief: Brief): string {
  const raw = (brief.socials?.email ?? "").trim();
  if (/^[^<>"'\s@]+@[^<>"'\s@]+\.[^<>"'\s@]{2,}$/.test(raw)) return raw;
  return "";
}

function renderChatbot(brief: Brief): string {
  const email = safeChatEmail(brief);
  const mailPart = email
    ? `    <button type="button" data-gs-chat-mail>Écrire un e-mail</button>
  </div>
</div>
<script>
(function () {
  var toggle = document.querySelector('[data-gs-chat-toggle]');
  var panel = document.querySelector('[data-gs-chat-panel]');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
  });
  var mail = document.querySelector('[data-gs-chat-mail]');
  if (mail) mail.addEventListener('click', function () {
    window.location.href = ${JSON.stringify(`mailto:${email}`)};
  });
})();
</script>`
    : `  </div>
</div>
<script>
(function () {
  var toggle = document.querySelector('[data-gs-chat-toggle]');
  var panel = document.querySelector('[data-gs-chat-panel]');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
  });
})();
</script>`;
  return `<div class="gs-chatbot">
  <button type="button" data-gs-chat-toggle>Une question ?</button>
  <div data-gs-chat-panel hidden>
    <p>Bonjour 👋, laissez-nous un message et nous vous répondrons rapidement.</p>
${mailPart}`;
}

/** Métadonnées Open Graph pour le site généré (partage réseaux sociaux). */
function renderOgMeta(siteName: string, about: string, tagline: string): string {
  const description = truncate(tagline || about, 160);
  return [
    `<meta property="og:title" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
}

/**
 * Construit le site vitrine final (HTML autonome) à partir du brief validé
 * et du résultat de matching. Toute donnée utilisateur est échappée.
 */
export function buildSite(brief: Brief, result: MatchResult): string {
  const meta = findTemplate(result.templateId);
  const source = (meta && getTemplateSource(meta.id)) || TEMPLATE_SOURCES[TEMPLATES[0]!.id]!;
  // Les tokens design sont toujours résolus : thème IA si dispo, sinon
  // sélection déterministe par secteur (accent du brief préservé).
  const design = result.design ?? resolveDesign(undefined, brief);

  const siteName = brief.siteName.trim() || "Mon site";
  const about = result.content.about || brief.description;
  const logo = renderLogo(brief, siteName);

  const tokens: Record<string, string> = {
    "{{SITE_NAME}}": escapeHtml(siteName),
    "{{TAGLINE}}": escapeHtml(result.content.tagline || ""),
    "{{ABOUT_SHORT}}": escapeHtml(truncate(about)),
    "{{ABOUT}}": escapeHtml(about),
    "{{CTA}}": escapeHtml(result.content.cta || "Contactez-nous"),
    "{{PRIMARY}}": design.accent,
    "{{PRIMARY_SOFT}}": design.accentSoft,
    "{{DARK_BG}}": design.darkBg,
    "{{YEAR}}": String(new Date().getFullYear()),
    "{{LOGO}}": logo,
    "{{SOCIAL}}": renderSocials(brief),
    "{{SECTIONS}}": renderSections(result),
    "{{ARTICLES}}": renderArticles(brief),
    "{{CHATBOT}}": brief.chatbot ? renderChatbot(brief) : "",
  };

  const built = Object.entries(tokens).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    source,
  );

  // Métadonnées Open Graph injectées dans le <head> (site exporté / mis en ligne).
  const og = renderOgMeta(siteName, about, result.content.tagline || "");
  // Feuille de style du thème (polices, typographie, thème sombre, effets) :
  // injectée après le style du template pour la prioriser.
  const themeStyle = renderThemeStyle(design);
  return built.replace(/[\t ]*<\/head>/, `\n    ${themeStyle}\n    ${og}\n  </head>`);
}

/** Polices Google du thème : liens dédupliqués + préconnexion. */
function renderFontLinks(design: DesignTokens): string {
  const families = [...new Set([design.displayFont, design.bodyFont])].map(
    (name) => `${name.split(" ").join("+")}:wght@400;600;700`,
  );
  const links = families
    .map(
      (f) =>
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f}&display=swap" />`,
    )
    .join("\n    ");
  return `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    ${links}`;
}

/** Surfaces sombres : inverse texte, cartes et hero des templates clairs. */
const DARK_SURFACE_CSS = `:root { --ink: #f2f4f7; --muted: #a7afbd; --card: #15171c; --border: rgba(255, 255, 255, 0.09); }
    body { background: var(--bg); color: var(--ink); }
    .gs-nav { background: rgba(10, 11, 14, 0.9); }
    .gs-hero { background: linear-gradient(180deg, var(--primary-soft) 0%, var(--bg) 100%); }
    .gs-card, .gs-section[data-section="menu"], .gs-section[data-section="gallery"], .gs-section[data-section="articles"] { background: var(--card); }
    .gs-social a { color: var(--ink); border-color: var(--ink); }`;

/**
 * Feuille de style du thème : variables typographiques, override des
 * familles de police des templates, surface sombre et effets du thème.
 * 100 % dérivée de valeurs validées (allowlists) — aucun texte LLM.
 */
export function renderThemeStyle(design: DesignTokens): string {
  const displayStack = FONT_STACKS[design.displayFont] ?? "Georgia, 'Times New Roman', serif";
  const bodyStack =
    FONT_STACKS[design.bodyFont] ?? "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const fonts = renderFontLinks(design);
  const dark = design.darkSurface ? DARK_SURFACE_CSS : "";
  return `${fonts}
    <style>
      :root {
        --font-display: ${displayStack};
        --font-body: ${bodyStack};
        --radius: ${design.radius}px;
      }
      body, .gs-body, .gs-tagline, .gs-nav-links a, .gs-btn, .gs-social a, .gs-footer, .gs-chatbot button, .gs-card-body p { font-family: var(--font-body); }
      h1, h2, h3, .gs-brand, .gs-heading, .gs-card-body h3 { font-family: var(--font-display); }
      .gs-btn, .gs-social a { border-radius: var(--radius); }
      ${dark}
      ${design.effects}
    </style>`;
}

/** Rendu du logo du brief : image uploadée (data URL validée), sinon monogramme. */
function renderLogo(brief: Brief, siteName: string): string {
  const dataUrl = safeLogoDataUrl(brief.logoDataUrl);
  if (dataUrl) {
    return `<img class="gs-logo gs-logo-img" src="${escapeHtml(dataUrl)}" alt="${escapeHtml(
      brief.siteName.trim() || "Logo",
    )}" style="object-fit:cover;border-radius:0.45rem" />`;
  }
  if (brief.hasLogo) {
    return `<span class="gs-logo" aria-hidden="true">${escapeHtml(
      (siteName.charAt(0) || "W").toUpperCase(),
    )}</span>`;
  }
  return "";
}
