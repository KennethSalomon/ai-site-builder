# GuardSite AI — Générateur de sites vitrines par IA

Hackathon EPITNET 2026 — Équipe : Kenneth, Thed, Primaëlle.

Le cahier des charges complet et la doctrine produit sont dans
[`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md).

GuardSite AI génère un site vitrine professionnel à partir d'un bref utilisateur :
le moteur IA (Gemini) sélectionne le template local le plus adapté, rédige les
contenus contextualisés, puis injecte chirurgicalement le tout dans le template
retenu. Le site résultant est prévisualisable, inspectable et exportable.

## Stack

- **Frontend / Orchestrateur :** [TanStack Start](https://tanstack.com/start)
  (React 19, SSR, Router + Query), Vite 8, Tailwind CSS v4, Zod.
- **Backend :** server-functions TanStack (`createServerFn`) exécutées côté
  serveur via [Nitro](https://nitro.unjs.io) (cible Vercel).
- **Moteur IA :** Gemini (`gemini-2.5-flash`) via le SDK officiel
  [`@google/genai`](https://www.npmjs.com/package/@google/genai) — clé attendue
  dans `GEMINI_API_KEY`. En l'absence de clé, un fallback déterministe par
  secteur prend le relais (jamais de crash).
- **Banque de templates :** 5 templates HTML autonomes dans
  `src/lib/templates/templates/`, indexés par `registry.ts`.

## Démarrage

Prérequis : Node.js 20+ et npm.

```sh
npm install
cp .env.example .env   # renseigner GEMINI_API_KEY (+ VERCEL_TOKEN pour la mise en ligne)
npm run dev
```

## Scripts

| Commande            | Rôle                                |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Serveur de développement            |
| `npm run build`     | Build de production (Nitro, cible Vercel) |
| `npm run preview`   | Prévisualisation du build           |
| `npm test`          | Suite de tests (Vitest)             |
| `npm run test:e2e`  | E2E (serveur dev requis, cf. infra) |
| `npm run typecheck` | Vérification TypeScript (`tsc`)     |
| `npm run lint`      | ESLint                              |
| `npm run deploy`    | Déploiement Nitro (`--prebuilt`)    |

## Déploiement de la plateforme sur Vercel

Le build produit un artefact compatible Vercel (`defaultPreset: "vercel"` dans
`vite.config.ts`). La commande qui fait tout — build, injection des clés IA
dans le projet Vercel, déploiement réel :

```sh
npm run vercel:deploy
```

Sous le capot : `npm run build` (artefact `.vercel/output`) → `npm run vercel:sync`
(synchronise les variables du `.env` dans le projet Vercel) → `npm run deploy`
(`nitro deploy --prebuilt`). Si le projet n'existe pas encore chez Vercel, il
est créé au nom du package puis reçoit les clés **avant** le déploiement, de
sorte que Gemini (ou Grok) est actif dès le premier build déployé.

**Pourquoi cette étape ?** Vercel n'a pas accès à votre `.env` local : sans
synchronisation, le déploiement ne possède aucune clé et le moteur IA retombe
sur son fallback déterministe (aucune génération IA réelle). Les variables sont
stockées chiffrées côté Vercel (`type: encrypted`, env production + preview +
dev).

Utilisation avancée :

```sh
node scripts/sync-vercel-env.mjs --dry-run          # prévisualise la synchro
node scripts/sync-vercel-env.mjs --project=<nom>    # viser un autre projet Vercel
npm run deploy                                      # déployer seul (VERCEL_TOKEN dans l'env)
```

Toute modification d'environnement n'est appliquée qu'au prochain déploiement —
`npm run vercel:deploy` la prend en compte automatiquement (ordre build → env →
deploy).

Variables d'environnement à configurer côté Vercel : `GEMINI_API_KEY` (LLM),
`VERCEL_TOKEN` (mises en ligne des productions depuis la plateforme), et
optionnellement `RATE_LIMIT_SECRET` (signature des sessions, stable entre
redéploiements).

## Fonctionnalités

- Brief guidé en 3 étapes (identité, contenus & visuel, options & réseaux).
- Génération rapide depuis la page d'accueil (nom + secteur + description).
- Upload d'un logo réel (data URL bornée, rendu dans le site généré).
- Sélection de template + rédaction IA (matching `src/lib/matching.server.ts`),
  avec injection sécurisée des variables dans le HTML
  (`src/lib/templates/engine.ts`, échappement anti-XSS).
- Persistance locale des projets (favoris, suppression, palette, chatbot).
- Fiche projet : contenus IA, prévisualisation sandbox, code source généré
  (avec copie du code).
- **Export réel :** le site généré se télécharge en fichier `index.html`
  autonome, ouvrable tel quel dans un navigateur.
- **Mise en ligne en un clic :** publication réelle du site généré sur
  **Vercel**, l'hébergeur de la plateforme et de ses productions. Le HTML
  autonome est déployé en statique via l'API REST de Vercel
  (`src/lib/vercel.server.ts`) et devient accessible sur
  `https://{projet}.vercel.app`. Le re-déploiement d'un projet publié
  conserve la même URL (même projet Vercel). Jeton attendu dans
  `VERCEL_TOKEN` ; sans jeton, l'erreur est explicite (jamais de faux
  déploiement local).
- Rate-limiting par cookie de session signé (HMAC) et par IP.

## Tests

```sh
npm test                     # suite unitaire + serveur (hermétique)
npm run dev                  # serveur requis pour l'e2e
npx vitest run --config vitest.e2e.config.ts   # e2e : brief -> Gemini -> publication
```

L'e2e vérifie la génération Gemini de bout en bout (fallback désactivé) ; le
déploiement réel est exercé uniquement si un `VERCEL_TOKEN` est présent côté
serveur (sinon l'étape est ignorée, sans échec).

## Structure

```
src/
  routes/          Routing fichier (dashboard, wizard, projects, resources…)
  components/      Layout (AppShell, AppSidebar) + composants UI (shadcn)
  lib/
    brief.ts           Schémas Zod partagés (client + serveur)
    llm.server.ts      Moteur IA multi-provider (Gemini par défaut, Grok)
    matching.server.ts Matching IA + fallback déterministe
    templates/         Moteur d'injection + templates HTML + index
    design/            Design system (genres, thèmes, polices, prompt LLM)
    vercel.server.ts   Déploiement réel des productions sur Vercel
    catalog/           Catalogue de composants (démo pipeline)
    store.ts           Persistance localStorage
    rate-limit.server.ts, error-capture.ts, seo.ts…
  hooks/           React Query / mutations
```

## Environnement

| Variable                                         | Requise | Description                                       |
| ------------------------------------------------ | ------- | ------------------------------------------------- |
| `GEMINI_API_KEY`                                 | non     | Clé de l'API Gemini (SDK officiel). Fallback sans |
| `VERCEL_TOKEN`                                   | non     | Jeton API Vercel : mise en ligne réelle des sites générés |
| `LLM_PROVIDER` / `GEMINI_MODEL` / `LLM_MODEL`    | non     | Sélection provider/modèles (Gemini par défaut)    |
| `XAI_API_KEY`                                    | non     | Alternative Grok (xAI, requiert des crédits)      |
| `RATE_LIMIT_SECRET`                              | non     | Signature stable des sessions (recommandé en prod) |
