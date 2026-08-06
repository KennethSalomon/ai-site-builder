import { TEMPLATES, findTemplate, type Sector } from "./templates/registry";
import { matchResultSchema } from "./brief";
import type { Brief, MatchResult } from "./brief";
import { DESIGN_LANGUAGE, resolveDesign } from "./design/design-language";
import { generateJson, lastAiFailureReason } from "./llm.server";
import { logger } from "./logger";

const SYSTEM = `Tu es le moteur de sélection et de rédaction d'un générateur de sites vitrines.
On te donne un brief client complet et l'index de métadonnées des templates locaux disponibles.

${DESIGN_LANGUAGE}

COLLECTE DES INFORMATIONS UTILISATEUR — exploite TOUTES les données du brief, pas seulement la description :
1. siteName : inspire la tagline et le ton (marque, zone, clientèle).
2. description : activité, services, clientèle cible, points différenciants.
3. articles/produits (liste) : intègre ces produits réels dans les sections adaptées (menu, catalogue, produits, tarifs) — ne les invente pas.
4. socials : email (pour le CTA et le chatbot), réseaux sociaux — le ton doit correspondre à l'audience.
5. hasLogo / palette : la direction visuelle (couleur dominante, présence d'un logo).
6. chatbot : si activé, la section contact doit inviter au dialogue et à la prise de contact.

CHOIX DU TEMPLATE :
- Choisis LE template le plus adapté (secteur, style, besoin produits, chatbot).
- Préfère un template supportant les produits si le brief liste des articles.

CHOIX DU DESIGN (voir référentiel ci-dessus) :
- Choisis un thème du catalogue cohérent avec le secteur et le brief. Le champ "design" est obligatoire.
- Personnalise le thème si le brief le justifie : accent/darkBg en hex (#rrggbb), polices prises dans le catalogue du thème (2 max).

RÉDACTION :
- Contenus professionnels, en français, contextualisés au secteur ET aux produits fournis.
- Applique les règles d'honnêteté et de variété du référentiel : jamais de métriques inventées, jamais de copie générique, structure différente d'un site à l'autre.
- La tagline doit intégrer le nom du site ou sa promesse réelle.
- Les sections doivent refléter les articles réels du brief (noms, descriptions) quand le template les accueille.

Réponds STRICTEMENT en JSON, sans markdown, au format:
{"templateId":string,"reason":string,"design":{"theme":string,"accent":"#hex","darkBg":"#hex","displayFont":string,"bodyFont":string},"content":{"tagline":string,"about":string,"sections":[{"key":string,"heading":string,"body":string}],"cta":string}}
Les "key" des sections doivent appartenir aux sections du template choisi.
Tous les champs de "design" sont obligatoires sauf accent, darkBg, displayFont et bodyFont (optionnels, sinon valeurs par défaut du thème).`;

/** Copie contextuelle de repli par secteur (moteur IA indisponible). */
const TAGLINES: Record<Sector, string> = {
  Alimentation: "Des produits frais, un savoir-faire authentique",
  Beauté: "Votre beauté entre de bonnes mains",
  Médecine: "Votre santé, notre priorité",
  Électronique: "La technologie au service de votre quotidien",
  Commerciale: "Votre partenaire de confiance",
  Mode: "Un style qui vous ressemble",
  Services: "Des services sur mesure, des résultats concrets",
};

const CTAS: Record<Sector, string> = {
  Alimentation: "Réserver une table",
  Beauté: "Prendre rendez-vous",
  Médecine: "Prendre rendez-vous",
  Électronique: "Voir le catalogue",
  Commerciale: "Demander un devis",
  Mode: "Découvrir la collection",
  Services: "Demander un devis",
};

/** Sections purement structurelles (hero/footer) déjà rendues par le template. */
const SKIP_FALLBACK_SECTIONS = new Set(["hero", "footer"]);

const SECTION_COPY: Record<string, { heading: string; body: string }> = {
  menu: { heading: "Notre carte", body: "Des produits frais et de saison, préparés avec soin." },
  gallery: { heading: "Galerie", body: "Découvrez nos réalisations en images." },
  about: { heading: "À propos", body: "Une équipe passionnée, à votre service." },
  services: {
    heading: "Nos services",
    body: "Des prestations pensées pour répondre à vos besoins.",
  },
  pricing: { heading: "Tarifs", body: "Des formules claires et adaptées à chaque projet." },
  testimonials: { heading: "Avis clients", body: "Ils nous font confiance au quotidien." },
  specialties: { heading: "Nos spécialités", body: "Un accompagnement expert et personnalisé." },
  team: { heading: "Notre équipe", body: "Des professionnels à l'écoute de vos attentes." },
  hours: { heading: "Horaires", body: "Contactez-nous pour connaître nos horaires d'ouverture." },
  catalog: { heading: "Notre catalogue", body: "Un large choix de produits disponibles." },
  specs: {
    heading: "Caractéristiques",
    body: "Des garanties techniques et une qualité irréprochable.",
  },
  cta: { heading: "Passer à l'action", body: "Rejoignez-nous dès aujourd'hui." },
  offers: { heading: "Nos offres", body: "Des solutions sur mesure, simples et efficaces." },
  process: {
    heading: "Notre méthode",
    body: "Une démarche claire, du premier contact à la livraison.",
  },
  faq: {
    heading: "Questions fréquentes",
    body: "Retrouvez les réponses aux questions les plus courantes.",
  },
};

function fallback(brief: Brief, reason = "Moteur IA indisponible."): MatchResult {
  const tpl =
    TEMPLATES.find((t) => t.sectors.includes(brief.sector as never)) ??
    TEMPLATES[TEMPLATES.length - 1]!;
  const sector = brief.sector as Sector;
  const articleTitles = (brief.articles ?? []).map((a) => a.title.trim()).filter(Boolean);
  // Les sections « catalogue » du template accueillent les vrais articles du
  // brief quand ils existent (le fallback n'invente jamais de contenus).
  const articleSections = new Set([
    "menu",
    "catalog",
    "pricing",
    "offers",
    "services",
    "specialties",
  ]);
  return {
    templateId: tpl.id,
    templateName: tpl.name,
    reason: `Sélection déterministe par secteur (${brief.sector}) — moteur IA indisponible.`,
    fallbackReason: reason,
    design: resolveDesign(undefined, brief),
    content: {
      tagline: TAGLINES[sector] ?? `${brief.siteName}, votre référence en ${brief.sector}.`,
      about: brief.description,
      sections: tpl.sections
        .filter((key) => !SKIP_FALLBACK_SECTIONS.has(key))
        .slice(0, 4)
        .map((key) => {
          const copy = SECTION_COPY[key];
          const body =
            articleSections.has(key) && articleTitles.length > 0
              ? `Nous vous proposons : ${articleTitles.join(" · ")}.`
              : (copy?.body ?? brief.description);
          return {
            key,
            heading: copy?.heading ?? key,
            body,
          };
        }),
      cta: CTAS[sector] ?? "Contactez-nous",
    },
    isFallback: true,
  };
}

/**
 * Nettoie la réponse IA : valide la forme avec Zod, rejette les sections
 * qui n'appartiennent pas au template retenu (injection chirurgicale sûre).
 * Exposé pour les tests (fonction pure).
 */
export function normalizeResult(raw: string, brief: Brief): MatchResult | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const validated = matchResultSchema.safeParse(parsed);
  if (!validated.success) return null;
  const tpl = findTemplate(validated.data.templateId);
  if (!tpl) return null;
  const allowed = new Set(tpl.sections);
  const sections = validated.data.content.sections.filter((s) => allowed.has(s.key)).slice(0, 8);
  return {
    ...validated.data,
    templateName: tpl.name,
    design: resolveDesign(validated.data.design, brief),
    content: { ...validated.data.content, sections },
    isFallback: false,
  };
}

export async function matchTemplate(brief: Brief): Promise<MatchResult> {
  // On ne transmet jamais le blob du logo (base64) au LLM.
  const user = JSON.stringify({
    brief: (() => {
      const { logoDataUrl: _logoDataUrl, ...rest } = brief;
      return rest;
    })(),
    templates: TEMPLATES.map(({ tokens, ...meta }) => meta),
  });

  const raw = await generateJson(SYSTEM, user);
  if (raw === null) {
    const reason = lastAiFailureReason() ?? "Moteur IA indisponible.";
    logger.warn(`Moteur IA indisponible (${reason}) — bascule sur la sélection déterministe.`);
    return fallback(brief, reason);
  }

  const result = normalizeResult(raw, brief);
  if (!result) {
    const reason = "La réponse de l'IA n'a pas passé la validation des schémas.";
    logger.error(`${reason} — bascule sur le fallback déterministe.`);
    return fallback(brief, reason);
  }
  return result;
}
