/**
 * Banque de templates locaux — index de métadonnées.
 * Gemini reçoit uniquement ces métadonnées (pas le code) pour choisir
 * le template le plus adapté au brief utilisateur.
 */

/** Jetons réellement injectés par le moteur (engine.ts) dans tous les templates. */
export const ENGINE_TOKENS = [
  "{{SITE_NAME}}",
  "{{TAGLINE}}",
  "{{ABOUT_SHORT}}",
  "{{ABOUT}}",
  "{{CTA}}",
  "{{PRIMARY}}",
  "{{PRIMARY_SOFT}}",
  "{{DARK_BG}}",
  "{{YEAR}}",
  "{{LOGO}}",
  "{{SOCIAL}}",
  "{{SECTIONS}}",
  "{{ARTICLES}}",
  "{{CHATBOT}}",
];
export type Sector =
  "Alimentation" | "Beauté" | "Médecine" | "Électronique" | "Commerciale" | "Mode" | "Services";

export const SECTORS: Sector[] = [
  "Alimentation",
  "Beauté",
  "Médecine",
  "Électronique",
  "Commerciale",
  "Mode",
  "Services",
];

export type TemplateMeta = {
  id: string;
  name: string;
  sectors: Sector[];
  style: string;
  layout: string;
  /** Blocs disponibles pour l'injection chirurgicale */
  sections: string[];
  /** Placeholders injectables présents dans les fichiers du template */
  tokens: string[];
  supportsChatbot: boolean;
  supportsProducts: boolean;
  description: string;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "gourmet-01",
    name: "Gourmet Table",
    sectors: ["Alimentation"],
    style: "chaleureux, photo pleine largeur, typographie serif",
    layout: "hero + menu + galerie + contact",
    sections: ["hero", "menu", "gallery", "about", "contact", "footer"],
    tokens: ENGINE_TOKENS,
    supportsChatbot: true,
    supportsProducts: true,
    description: "Restaurant, traiteur, épicerie fine. Met en avant les visuels de plats.",
  },
  {
    id: "glow-02",
    name: "Glow Studio",
    sectors: ["Beauté", "Mode"],
    style: "élégant, pastel, beaucoup de blanc, animations douces",
    layout: "hero split + services + tarifs + avis",
    sections: ["hero", "services", "pricing", "testimonials", "contact", "footer"],
    tokens: ENGINE_TOKENS,
    supportsChatbot: true,
    supportsProducts: true,
    description: "Salon, institut, marque mode. Orienté prise de rendez-vous.",
  },
  {
    id: "care-03",
    name: "CareTrust",
    sectors: ["Médecine", "Services"],
    style: "sobre, rassurant, bleu clinique, haute lisibilité",
    layout: "hero + spécialités + équipe + horaires",
    sections: ["hero", "specialties", "team", "hours", "contact", "footer"],
    tokens: ENGINE_TOKENS,
    supportsChatbot: true,
    supportsProducts: false,
    description: "Cabinet, clinique, professionnel de santé. Confiance et clarté.",
  },
  {
    id: "techgrid-04",
    name: "TechGrid",
    sectors: ["Électronique", "Commerciale"],
    style: "moderne, sombre, grille produits dense, accents néon",
    layout: "hero + catalogue + specs + CTA",
    sections: ["hero", "catalog", "specs", "cta", "contact", "footer"],
    tokens: ENGINE_TOKENS,
    supportsChatbot: true,
    supportsProducts: true,
    description: "Boutique électronique, revendeur, catalogue matériel.",
  },
  {
    id: "corpo-05",
    name: "Corpo Lite",
    sectors: ["Commerciale", "Services"],
    style: "corporate minimal, cartes, iconographie linéaire",
    layout: "hero + offres + process + contact",
    sections: ["hero", "offers", "process", "faq", "contact", "footer"],
    tokens: ENGINE_TOKENS,
    supportsChatbot: true,
    supportsProducts: false,
    description: "PME, agence, prestataire de services B2B.",
  },
];

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
