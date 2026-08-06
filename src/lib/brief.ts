import { z } from "zod";
import { SECTORS } from "./templates/registry";
import type { DesignTokens } from "./design/design-language";

export const briefSchema = z.object({
  siteName: z.string().min(1).max(80),
  sector: z.enum(SECTORS as [string, ...string[]]),
  description: z.string().min(10).max(2000),
  palette: z.string().default("violet"),
  hasLogo: z.boolean().default(false),
  logoDataUrl: z
    .string()
    // ~300 Ko de fichier → ~400 Ko de base64. Borné pour le quota localStorage
    // et la taille du corps des server functions.
    .max(450_000)
    .optional(),
  socials: z
    .object({
      facebook: z.string().max(300).optional(),
      instagram: z.string().max(300).optional(),
      whatsapp: z.string().max(300).optional(),
      email: z.string().max(300).optional(),
    })
    .default({}),
  articles: z
    .array(
      z.object({
        title: z.string().max(120),
        description: z.string().max(500),
        image: z.string().max(1000).optional(),
      }),
    )
    .max(10)
    .default([]),
  chatbot: z.boolean().default(false),
});

export type Brief = z.infer<typeof briefSchema>;

export const emptyBrief = (): Brief => ({
  siteName: "",
  sector: SECTORS[0]!,
  description: "",
  palette: "violet",
  hasLogo: false,
  socials: {},
  articles: [],
  chatbot: false,
});

/**
 * Message d'erreur utilisateur pour un brief invalide (null si valide).
 * Utilisé côté client avant soumission pour un feedback immédiat.
 */
export function describeBriefError(data: unknown): string | null {
  const parsed = briefSchema.safeParse(data);
  if (parsed.success) return null;
  const issue = parsed.error.issues[0];
  if (!issue) return "Brief invalide : vérifiez les champs du formulaire.";
  switch (issue.path[0]) {
    case "siteName":
      return "Nom du site requis (80 caractères maximum).";
    case "sector":
      return "Secteur d'activité invalide.";
    case "description":
      return "Description requise : 10 caractères minimum, 2000 maximum.";
    case "palette":
      return "Palette invalide.";
    case "logoDataUrl":
      return "Logo trop lourd : 300 Ko maximum.";
    case "articles":
      return "10 articles maximum.";
    default:
      return `Champ invalide : ${issue.path.join(".")}.`;
  }
}

/** Schéma de sortie du moteur IA — validé côté serveur avant usage. */
export const matchResultSchema = z.object({
  templateId: z.string().min(1).max(64),
  reason: z.string().min(1).max(500),
  // Permissif : le strict filtrage du design est fait dans resolveDesign,
  // champ par champ, pour ne jamais rejeter une réponse globale à cause d'un
  // seul hex ou d'un thème inconnu (on retombe alors sur le secteur).
  design: z.record(z.string(), z.unknown()).optional(),
  content: z.object({
    tagline: z.string().max(120),
    about: z.string().max(2000),
    sections: z
      .array(
        z.object({
          key: z.string().min(1).max(32),
          heading: z.string().min(1).max(120),
          body: z.string().max(2000),
        }),
      )
      // Plafond large côté schéma : la troncature précise (8) est appliquée
      // dans normalizeResult pour ne pas rejeter une réponse globalement bonne.
      .max(16),
    cta: z.string().max(60),
  }),
});

export type MatchResult = {
  templateId: string;
  templateName: string;
  reason: string;
  content: {
    tagline: string;
    about: string;
    sections: { key: string; heading: string; body: string }[];
    cta: string;
  };
  /** `true` si le moteur IA était indisponible et qu'un fallback déterministe a été utilisé. */
  isFallback?: boolean;
  /** Raison du mode dégradé (erreur IA explicite), affichée à l'utilisateur. */
  fallbackReason?: string;
  /** Tokens design résolus (thème, couleurs, polices) appliqués au rendu. */
  design?: DesignTokens;
};
