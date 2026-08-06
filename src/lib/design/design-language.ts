import { z } from "zod";
import { findPalette } from "../palettes";

/**
 * Design system du générateur — distillé exclusivement depuis deux
 * référentiels installés dans le projet :
 *
 * 1. « Hallmark » (github.com/Nutlope/hallmark) : doctrine anti-template.
 *    Genres, honnêteté éditoriale, variété structurelle, discipline typo.
 * 2. « UI/UX Pro Max » (github.com/nextlevelbuilder/ui-ux-pro-max-skill) :
 *    styles UI, palettes et directives d'implémentation CSS.
 *
 * Le LLM ne doit produire QUE des sites conformes à ces deux référentiels :
 * plus jamais de site générique, chaque site est personnalisé (structure,
 * thème, contenus) en fonction du secteur et du brief.
 */

export type DesignGenre = "editorial" | "modern-minimal" | "atmospheric" | "playful";

export type DesignTheme = {
  id: string;
  name: string;
  genre: DesignGenre;
  /** Description pour le LLM (catalogue de thèmes). */
  description: string;
  /** Quand choisir ce thème. */
  usage: string;
  accent: string;
  accentSoft: string;
  darkBg: string;
  /** Force un rendu sombre (surface + texte inversés). */
  darkSurface: boolean;
  displayFont: string;
  bodyFont: string;
  radius: number;
  /** Directives CSS sûres (constantes du thème, jamais de texte LLM). */
  effects: string;
};

export const DESIGN_THEMES: DesignTheme[] = [
  {
    id: "bistro-chic",
    name: "Bistro Chic",
    genre: "editorial",
    description:
      "Typographie serif affirmée, terracotta chaleureux, ambiance table d'hôte soignée.",
    usage: "Restaurants, cafés, épiceries fines, alimentation artisanale.",
    accent: "#C2410C",
    accentSoft: "#FDBA74",
    darkBg: "#1C1410",
    darkSurface: false,
    displayFont: "Fraunces",
    bodyFont: "Inter",
    radius: 18,
    effects: "",
  },
  {
    id: "spa-calm",
    name: "Spa Calm",
    genre: "editorial",
    description: "Sauge apaisante, serif délicat, espaces généreux : le calme avant tout.",
    usage: "Beauté, bien-être, spas, instituts, coiffure.",
    accent: "#4E7C6B",
    accentSoft: "#A7C4B5",
    darkBg: "#101613",
    darkSurface: false,
    displayFont: "Cormorant Garamond",
    bodyFont: "DM Sans",
    radius: 16,
    effects: "",
  },
  {
    id: "clinical-clean",
    name: "Clinical Clean",
    genre: "modern-minimal",
    description:
      "Turquoise médical, mise en page claire, zéro ornement : la confiance par la clarté.",
    usage: "Médecine, santé, laboratoires, cabinets.",
    accent: "#0E7490",
    accentSoft: "#99E0F0",
    darkBg: "#0B1F26",
    darkSurface: false,
    displayFont: "Inter",
    bodyFont: "Inter",
    radius: 10,
    effects: "",
  },
  {
    id: "tech-dark",
    name: "Tech Dark",
    genre: "atmospheric",
    description: "Surface sombre, cyan néon, lueurs discrètes : la puissance technologique.",
    usage: "Électronique, high-tech, gaming, informatique.",
    accent: "#22D3EE",
    accentSoft: "#155E75",
    darkBg: "#060B14",
    darkSurface: true,
    displayFont: "Space Grotesk",
    bodyFont: "Inter",
    radius: 12,
    effects: `.gs-hero h1 { text-shadow: 0 0 22px var(--primary); }
      .gs-btn { box-shadow: 0 0 16px var(--primary); }`,
  },
  {
    id: "modern-corporate",
    name: "Modern Corporate",
    genre: "modern-minimal",
    description: "Bleu profond, angles nets, hiérarchie stricte : crédibilité immédiate.",
    usage: "B2B, conseil, négoce, industrie, commercial.",
    accent: "#1D4ED8",
    accentSoft: "#BFDBFE",
    darkBg: "#0B1220",
    darkSurface: false,
    displayFont: "Sora",
    bodyFont: "Inter",
    radius: 8,
    effects: "",
  },
  {
    id: "fashion-editorial",
    name: "Fashion Editorial",
    genre: "editorial",
    description: "Grand serif éditorial, rouge signé, lots de blanc : l'image avant tout.",
    usage: "Mode, créateurs, boutiques, marques lifestyle.",
    accent: "#B91C1C",
    accentSoft: "#F3E5D8",
    darkBg: "#17100B",
    darkSurface: false,
    displayFont: "Playfair Display",
    bodyFont: "Source Sans 3",
    radius: 4,
    effects: "",
  },
  {
    id: "services-trust",
    name: "Services Trust",
    genre: "modern-minimal",
    description: "Bleu de confiance, lisibilité maximale, ton proche : l'expertise accessible.",
    usage: "Services, freelance, conseil, artisans du service.",
    accent: "#2563EB",
    accentSoft: "#DBEAFE",
    darkBg: "#0F172A",
    darkSurface: false,
    displayFont: "Manrope",
    bodyFont: "Manrope",
    radius: 12,
    effects: "",
  },
  {
    id: "brutal-bistro",
    name: "Brutal Bistro",
    genre: "playful",
    description: "Angles droits, bordures épaisses, orange franc, typo massive : sans compromis.",
    usage: "Marques audacieuses, food trucks, créatifs, street-food.",
    accent: "#FF5A00",
    accentSoft: "#FFD166",
    darkBg: "#17110B",
    darkSurface: false,
    displayFont: "Bebas Neue",
    bodyFont: "Archivo",
    radius: 0,
    effects: `.gs-btn, .gs-card, .gs-hero-img, .gs-social a { border-radius: 0; }
      .gs-card, .gs-hero-img, .gs-btn, .gs-social a { border: 3px solid var(--ink); }
      .gs-btn { color: var(--ink); }`,
  },
  {
    id: "aurora-studio",
    name: "Aurora Studio",
    genre: "atmospheric",
    description: "Dégradé animé façon aurores boréales, surface sombre, énergie créative.",
    usage: "Agences créatives, événementiel, musique, studios.",
    accent: "#7C3AED",
    accentSoft: "#38BDF8",
    darkBg: "#0B0B1E",
    darkSurface: true,
    displayFont: "Outfit",
    bodyFont: "Inter",
    radius: 16,
    effects: `.gs-hero { background: linear-gradient(135deg, var(--primary), var(--primary-soft), var(--primary)); background-size: 300% 300%; animation: gs-aurora 12s ease infinite; }
      @keyframes gs-aurora { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`,
  },
  {
    id: "retro-neon",
    name: "Retro Neon",
    genre: "atmospheric",
    description: "Rose néon et cyan sur noir, lueurs intenses, hommage 80s et synthwave.",
    usage: "Gaming, cinéma, pop-culture, esports, médias.",
    accent: "#FF006E",
    accentSoft: "#00FFFF",
    darkBg: "#12122B",
    darkSurface: true,
    displayFont: "Orbitron",
    bodyFont: "Space Grotesk",
    radius: 0,
    effects: `.gs-hero h1 { text-shadow: 0 0 20px var(--primary), 0 0 44px var(--primary-soft); }
      .gs-btn { box-shadow: 0 0 18px var(--primary); }`,
  },
  {
    id: "glass-premium",
    name: "Glass Premium",
    genre: "modern-minimal",
    description: "Effets verre dépoli, transparence, bleu électrique : le haut de gamme moderne.",
    usage: "SaaS, fintech, prestations premium, innovation.",
    accent: "#0080FF",
    accentSoft: "#7DD3FC",
    darkBg: "#081018",
    darkSurface: false,
    displayFont: "Outfit",
    bodyFont: "Inter",
    radius: 20,
    effects: `.gs-nav { background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
      .gs-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }`,
  },
  {
    id: "organic-garden",
    name: "Organic Garden",
    genre: "editorial",
    description: "Vert végétal, serif chaleureux, coins doux : la nature à la table.",
    usage: "Bio, maraîchage, jardins, épiceries naturelles, artisanat.",
    accent: "#65A30D",
    accentSoft: "#D9F99D",
    darkBg: "#141207",
    darkSurface: false,
    displayFont: "Lora",
    bodyFont: "Inter",
    radius: 22,
    effects: "",
  },
  {
    id: "carnival-riso",
    name: "Carnival Riso",
    genre: "playful",
    description: "Rose vif et jaune soleil, rythme joyeux, impression riso assumée.",
    usage: "Événementiel, enfance, familles, commerces festifs.",
    accent: "#DB2777",
    accentSoft: "#FDE68A",
    darkBg: "#1F1230",
    darkSurface: false,
    displayFont: "Archivo",
    bodyFont: "Poppins",
    radius: 14,
    effects: `.gs-hero-img { background: linear-gradient(135deg, var(--primary), var(--primary-soft)); }
      .gs-btn { box-shadow: 6px 6px 0 var(--ink); }`,
  },
];

const GENRE_LABEL: Record<DesignGenre, string> = {
  editorial: "éditorial",
  "modern-minimal": "modern-minimal",
  atmospheric: "atmosphérique",
  playful: "joueur",
};

/** Sélection déterministe par secteur (moteur IA indisponible ou thème inconnu). */
const SECTOR_THEME: Record<string, string> = {
  Alimentation: "bistro-chic",
  Beauté: "spa-calm",
  Médecine: "clinical-clean",
  Électronique: "tech-dark",
  Commerciale: "modern-corporate",
  Mode: "fashion-editorial",
  Services: "services-trust",
};

export const findTheme = (id: string | undefined): DesignTheme | undefined =>
  DESIGN_THEMES.find((t) => t.id === id);

export function designForSector(sector: string): DesignTheme {
  return findTheme(SECTOR_THEME[sector]) ?? DESIGN_THEMES[0]!;
}

/** Pile CSS sûre (avec replis système) pour chaque police Google autorisée. */
export const FONT_STACKS: Record<string, string> = {
  Inter: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  "DM Sans": "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Manrope: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
  "Space Grotesk": "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Sora: "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Outfit: "'Outfit', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Archivo: "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Poppins: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
  "Source Sans 3": "'Source Sans 3', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Fraunces: "'Fraunces', Georgia, 'Times New Roman', serif",
  "Playfair Display": "'Playfair Display', Georgia, 'Times New Roman', serif",
  "Cormorant Garamond": "'Cormorant Garamond', Georgia, serif",
  Lora: "'Lora', Georgia, serif",
  "Bebas Neue": "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
  Orbitron: "'Orbitron', 'Space Grotesk', sans-serif",
};

export const DESIGN_FONT_NAMES = new Set(Object.keys(FONT_STACKS));

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Champ `design` de la réponse IA — validation stricte, champ par champ. */
export const designFieldSchema = z
  .object({
    theme: z.string().min(1).max(64),
    accent: z.string().regex(HEX_RE),
    accentSoft: z.string().regex(HEX_RE),
    darkBg: z.string().regex(HEX_RE),
    displayFont: z.string().min(1).max(40),
    bodyFont: z.string().min(1).max(40),
  })
  .partial();

export type DesignTokens = {
  themeId: string;
  themeName: string;
  genre: DesignGenre;
  accent: string;
  accentSoft: string;
  darkBg: string;
  darkSurface: boolean;
  displayFont: string;
  bodyFont: string;
  radius: number;
  effects: string;
  /** `llm` : thème choisi par le moteur IA · `fallback` : sélection déterministe. */
  source: "llm" | "fallback";
};

/** Valeur texte d'un champ du design IA, sinon `undefined` (tolérant). */
function fieldOf(raw: unknown, key: string): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : undefined;
}

const hexOf = (value: string | undefined): string | undefined =>
  value && HEX_RE.test(value) ? value : undefined;

const fontOr = (name: string | undefined): string | null =>
  name && DESIGN_FONT_NAMES.has(name) ? name : null;

/**
 * Résout les tokens design finaux à partir de la réponse IA brute et du brief.
 * Chaque champ est filtré individuellement : un thème inconnu, un hex mal
 * formé ou une police hors liste retombe silencieusement sur le thème
 * déterministe du secteur (ou sur la valeur du thème) — le rendu ne dépend
 * jamais de texte LLM non validé, et une réponse IA globalement bonne n'est
 * jamais rejetée à cause d'un seul champ design invalide.
 */
export function resolveDesign(
  raw: unknown,
  brief: { sector: string; palette: string },
): DesignTokens {
  const theme = findTheme(fieldOf(raw, "theme"));
  const source: DesignTokens["source"] = theme ? "llm" : "fallback";
  const base = theme ?? designForSector(brief.sector);

  return {
    themeId: base.id,
    themeName: base.name,
    genre: base.genre,
    // L'accent du brief reste prioritaire en mode fallback (choix utilisateur) ;
    // en mode IA, le thème choisi impose sa palette sauf override LLM valide.
    accent:
      hexOf(fieldOf(raw, "accent")) ??
      (theme ? base.accent : (findPalette(brief.palette).swatch[0] ?? base.accent)),
    accentSoft: hexOf(fieldOf(raw, "accentSoft")) ?? base.accentSoft,
    darkBg: hexOf(fieldOf(raw, "darkBg")) ?? base.darkBg,
    darkSurface: base.darkSurface,
    displayFont: fontOr(fieldOf(raw, "displayFont")) ?? base.displayFont,
    bodyFont: fontOr(fieldOf(raw, "bodyFont")) ?? base.bodyFont,
    radius: base.radius,
    effects: base.effects,
    source,
  };
}

/**
 * Catalogue des thèmes pour le prompt LLM — liste lisible id / nom / genre /
 * usage, sans jamais exposer de CSS.
 */
export const THEME_CATALOG: string = DESIGN_THEMES.map(
  (t) => `- "${t.id}" (${GENRE_LABEL[t.genre]}) — ${t.name} : ${t.description} ${t.usage}`,
).join("\n");

/**
 * Référentiel design injecté dans les prompts LLM (matching et rédaction).
 * Sources exclusives : « Hallmark » (structure, honnêteté, variété) et
 * « UI/UX Pro Max » (styles, palettes, directives d'implémentation).
 */
export const DESIGN_LANGUAGE = `RÉFÉRENTIEL DESIGN OBLIGATOIRE (aucun autre style n'est acceptable)
Tu appliques EXCLUSIVEMENT deux design systems, jamais un style générique de LLM :
1. HALLMARK — doctrine anti-template : chaque site a une structure, un rythme et une voix propres.
2. UI/UX PRO MAX — styles UI, palettes, typographies et directives d'implémentation CSS.

GENRES (4) — détecte le genre avant tout, il cadre le reste :
- editorial : ton de magazine, typographie serif affirmée, hiérarchie typographique forte. (alimentation, beauté, mode, artisanat, culture)
- modern-minimal : espace blanc généreux, grille stricte, une seule couleur d'accent. (médecine, services, commercial, B2B, SaaS)
- atmospheric : surfaces sombres, lueurs ou dégradés profonds, ambiance marquée. (électronique, high-tech, gaming, musique, studios)
- playful : couleurs franches, angles assumés, énergie et bonne humeur. (marques jeunes, événementiel, enfance, street-food)

RÈGLES D'OR (non négociables) :
1. HONNÊTETÉ ÉDITORIALE — n'invente JAMAIS de chiffres, de récompenses ou de preuves sociales absents du brief. Tout ce qui s'écrit doit se rattacher aux données réelles (description, articles, produits, zone, clientèle). Refuse les formules creuses (« partenaire de confiance », « à votre service ») quand le brief permet mieux : cite les vrais produits, la vraie spécialité, la vraie promesse.
2. VARIÉTÉ STRUCTURELLE — deux sites d'une même catégorie ne doivent JAMAIS avoir le même rythme. Varie l'ordre et le choix des sections du template, l'angle du hero, le ton. Un menu ne se raconte pas comme une clinique.
3. PERSONNALISATION — exploite chaque donnée du brief : le nom inspire la tagline, les articles deviennent les vrais produits mis en avant, l'e-mail nourrit l'appel à l'action. Un brief vide d'articles ne doit pas produire un site « produit » générique.
4. TYPOGRAPHIE — 2 polices maximum (une de titres + une de texte), choisies dans le catalogue du thème. Jamais de titre en italique. Hiérarchie stricte : titres grands et contrastés, texte secondaire discret.
5. COULEURS — 4 à 6 couleurs maximum, contraste texte/fond ≥ 4.5:1, une seule couleur d'accent dominante.
6. STRUCTURE — hero d'abord, puis les sections du template adaptées au secteur ; finir sur un appel à l'action clair.
7. ACCESSIBILITÉ — pensé mobile d'abord : cibles tactiles ≥ 44px, texte jamais en dessous de 14px, liens visibles.

CATALOGUE DE THÈMES (choisis-en EXACTEMENT un, le plus cohérent avec le secteur) :
${THEME_CATALOG}`;
