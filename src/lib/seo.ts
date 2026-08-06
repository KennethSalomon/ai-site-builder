type SeoMeta =
  { title: string } | { name: string; content: string } | { property: string; content: string };

/** Bloc `<head>` standardisé pour les routes (titre, description, partage). */
export function seoMeta(title: string, description: string): SeoMeta[] {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
