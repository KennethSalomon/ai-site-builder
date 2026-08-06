import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Slug d'hébergement : minuscules ASCII, tirets, borné à 32 caractères. */
export function slugify(siteName: string): string {
  return (
    siteName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 32) || "site"
  );
}

/**
 * Nom de fichier pour l'export du site généré.
 * Exemple : "Le Comptoir de Julie" -> "le-comptoir-de-julie.html".
 */
export function siteExportFilename(siteName: string): string {
  return `${slugify(siteName)}.html`;
}

/**
 * Export réel : déclenche le téléchargement du HTML généré sous forme de
 * fichier autonome `index.html` (le template est auto-suffisant : styles et
 * scripts inline). Le fichier téléchargé s'ouvre directement dans un
 * navigateur — c'est l'artefact de déploiement du MVP.
 */
export function downloadSiteHtml(html: string, siteName: string): boolean {
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = siteExportFilename(siteName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export PDF : rend le site généré dans un iframe hors-écran et lance la
 * boîte d'impression du navigateur (« Enregistrer au format PDF »).
 * Sans dépendance (html2canvas/jspdf) : le PDF vectoriel est plus net et la
 * boîte reste compatible avec tous les navigateurs.
 */
export function printSiteHtml(html: string): boolean {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return false;
    }
    win.addEventListener("load", () => {
      try {
        win.focus();
        win.print();
      } finally {
        iframe.remove();
      }
    });
    return true;
  } catch {
    return false;
  }
}

const deploySchema = z.object({
  id: z.string().min(1).max(64),
  siteName: z.string().min(1).max(80),
  html: z.string().min(50).max(2_000_000),
  /** Nom de projet Vercel existant (re-déploiement) : l'URL publique reste identique. */
  slug: z
    .string()
    .regex(/^[a-z0-9-]{1,48}$/)
    .optional(),
});

export type DeployPayload = {
  url: string;
  slug: string;
  deployedAt: string;
};

/**
 * Mise en ligne réelle sur Vercel : publie le HTML généré comme déploiement
 * statique et retourne l'URL publique (`https://{projet}.vercel.app`).
 * Le re-déploiement (slug existant) conserve la même URL.
 * Sans `VERCEL_TOKEN` configuré côté serveur, l'erreur est explicite.
 */
export const deploySite = createServerFn({ method: "POST" })
  .validator((data: unknown) => deploySchema.parse(data))
  .handler(async ({ data }): Promise<DeployPayload> => {
    const { assertDeployAllowed } = await import("./rate-limit.server");
    assertDeployAllowed();

    const { deployToVercel } = await import("./vercel.server");
    const deployment = await deployToVercel(data.siteName, data.html, data.slug);
    return {
      url: deployment.url,
      slug: deployment.slug,
      deployedAt: deployment.deployedAt,
    };
  });
