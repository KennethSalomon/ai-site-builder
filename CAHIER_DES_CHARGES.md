# Cahier des charges — GuardSite AI

> **Projet** : GuardSite AI — générateur de sites vitrines professionnels par IA
> **Contexte** : Hackathon EPITNET 2026
> **Équipe** : Kenneth, Thed & Primaëlle
> **Version** : 1.0
> **Statut** : production (MVP livré, phase « mise au marché »)
> **Liens techniques** : `README.md`, `AGENTS.md` (doctrine design)

---

## 1. Contextualisation du projet

### 1.1 Le problème de terrain

Aujourd'hui, un indépendant, un restaurant, un cabinet ou une petite entreprise
qui veut un site vitrine propre rencontre trois obstacles :

1. **Le coût et la lenteur du mode classique** : un développeur ou une agence
   facture plusieurs jours, voire plusieurs semaines, pour un site qui devra de
   toute façon être mis à jour.
2. **Les générateurs « clic par clic »** (constructeurs classiques) : ils
   produisent des sites génériques, lourds, et exigent de l'utilisateur un
   travail manuel long. Les sites d'IA « de scraping » disponibles sur le
   marché inondent de contenu passe-partout, de métriques inventées et de
   visuels génériques — du « slop ».
3. **Le manque d'adaptation et d'honnêteté du contenu** : peu d'outils adaptent
   réellement le texte au métier, aux produits réels et à la tonalité locale.

Le propriétaire veut la chose la plus simple du monde : **donner cinq
informations sur son activité et obtenir, en moins d'une minute, un site vitrine
digne de ce nom, en ligne, à une URL stable**.

### 1.2 La solution

**GuardSite AI** est une plateforme web qui transforme un « brief » (nom du
commerce, secteur, description, couleurs, réseaux sociaux, articles, logo) en un
site vitrine complet :

- **rédaction du contenu par IA** (Gemini par défaut — alternative Grok/xAI) ;
- **sélection du template et du design** par IA, sur un système design strict
  (aucun « slop ») ;
- **rendu HTML autonome, sûr et exportable** (un seul fichier `index.html`) ;
- **mise en ligne réelle en un clic** chez le même hébergeur que les
  plateformes, avec URL stable `https://{projet}.vercel.app` ;
- face à une indisponibilité du moteur, le produit préfère un **fallback
  déterministe honnête** plutôt qu'un faux succès.

### 1.3 Origine et contexte

Le projet est né dans le cadre du **hackathon EPITNET 2026** pour construire
une solution complète et professionnelle (design, génération IA, déploiements
réels), et non une simple démo. Il est développé et maintenu par
**Kenneth, Thed et Primaëlle**, en respectant une doctrine d'ingénierie stricte
(documentée dans `AGENTS.md`) : la plateforme doit toujours rester dans un état
fonctionnel — typecheck, lint, tests et build passent avant chaque publication.

### 1.4 Cibles

- **Utilisateurs finaux (clients de la plateforme)** : TPE, artisans, commerces
  de proximité, restaurateurs, salons de beauté, cabinets médicaux et
  prestataires de services, qui veulent un site vitrine sans intermédiaire.
- **Utilisateurs de la plateforme** : ce sont les mêmes personnes, capables de
  renseigner un formulaire guidé sans compétence technique.

### 1.5 Positionnement et différenciation

| Concurrent « classique »        | GuardSite AI                         |
| ------------------------------- | ------------------------------------ |
| Templates génériques identiques  | Design system propriétaire + tokens   |
| Contenu pseudo-générique         | Rédaction IA adaptée au brief        |
| Métriques/prix inventés           | Honnêteté éditoriale (jamais de fake) |
| Mise en ligne compliquée         | Publication réelle en un clic        |
| Hébergement opaque               | Hébergement identique à la plateforme (Vercel) |

Différenciation concrète :
- **Design sans « slop »** : doctrine issue des référentiels **Hallmark** et
  **UI/UX Pro Max** (structure, honnêteté, variété) ; 13 thèmes, polices en
  allowlist (15 Google Fonts), contrastes AA, mobile-first.
- **IA augmentée, pas magique** : si le moteur IA est indisponible, le
  fallback déterministe par secteur prend le relais et le signale — jamais de
  génération fantasmée.
- **Zéro faux déploiement** : sans jeton Vercel valide, l'erreur est explicite,
  jamais de simulation locale.
- **Souveraineté du rendu statique** : chaque site est un fichier HTML
  autonome, téléchargeable et réutilisable en dehors de la plateforme.

### 1.6 Écosystème technique

- **Frontend / orchestration** : TanStack Start (React 19, SSR, Router + Query,
  server functions), Vite 8, Tailwind CSS v4, Zod.
- **Runtime serveur** : Nitro, cible **Vercel** (build `defaultPreset: "vercel"`).
- **Moteur IA** : module multi-provider — **Gemini** (`gemini-2.5-flash`, clé
  gratuite Google AI Studio) par défaut ; **Grok/xAI** en alternative ; fallback
  déterministe par secteur.
- **Hébergement des productions** : API REST Vercel (déploiement statique,
  URL stable).
- **Persistance utilisateur** : localStorage (projets, favoris, réglages).

### 1.7 Bénéfices attendus

- **Côté métier** : un site vitrine livré < 60 s à partir d'un brief simple.
- **Côté plateforme** : coût d'exécution quasi nul (IA gratuite, free tiers),
  déploiement reproductible et auditable, qualité constante.
- **Côté utilisateur** : aucune compétence technique, URL publique stable,
  re-déploiement possible sans changer d'adresse.

---

## 2. Objectifs et vision

### 2.1 Vision

Devenir l'outil de référence pour créer un site vitrine « sérieux » en quelques
minutes, là où la concurrence produit des blocs génériques.

### 2.2 Objectifs spécifiques

1. Générer un site conforme à la doctrine design (anti-slop) à partir d'un
   brief en moins de 60 secondes.
2. Rendre chaque site public et accessible via une URL stable, sans aucune
   manipulation technique.
3. Garantir une expérience fiable : jamais de contenu inventé, jamais de faux
   déploiement, message d'erreur explicite en mode dégradé.
4. Respecter la qualité logicielle (tests, lint, build) à chaque livraison.

### 2.3 Indicateurs de succès (cibles)

| Indicateur                                   | Cible                |
| -------------------------------------------- | -------------------- |
| Temps de génération (Gemini)                 | < 30 s par site       |
| Taux de fallback déterministe                | < 5 % des générations |
| Taux de « slop » détecté par auto-audit      | 0                     |
| Lighthouse performance (site généré)         | ≥ 90                 |
| Accessibilité (contraste AA, mobile)         | présente              |
| Taux de déploiements Vercel réussis          | > 95 %               |
| Suite de tests                              | 100 % de suites vertes          |

### 2.4 Hors périmètre (à ce stade)

- Commerce électronique complet (panier, paiement, catalogue multi-pages).
- Éditeur WYSIWYG / gestion de contenu par l'utilisateur après génération.
- Comptes multi-utilisateurs riches (aucune base multi-tenant pour l'instant).
- SSO ou authentification par identifiants métier (auth Google retenue).
- Déploiement multi-providers cloud autres que Vercel.

---

## 3. Périmètre fonctionnel

### 3.1 Fonctionnalités (exigences fonctionnelles)

Chaque exigence est priorisée : **M** (must), **S** (should), **C** (could).

| Id | Exigence | Priorité | Critère d'acceptation |
|---|--------------------------------------------|----------|---------------------------------------------|
| RF-01 | Brief guidé en 3 étapes (identité, contenus & visuel, options & réseaux) | M | Formulaire validé (Zod), champs bornés, erreurs explicites à l'écran |
| RF-02 | Génération rapide depuis la page d'accueil (nom + secteur + description) | M | Un clic déclenche génération sans passer par le wizard |
| RF-03 | Sélection du template par IA | M | Gemini reçoit les métadonnées de templates (jamais le code) et choisit `templateId` |
| RF-04 | Rédaction du contenu par IA | M | `tagline`, `about`, `sections`, `cta` produits et validés côté serveur |
| RF-05 | Fallback déterministe par secteur | M | Sans clé/réponse IA, un contenu par secteur prend la relève, `isFallback: true` |
| RF-06 | Application du design system par IA (13 thèmes, 4 genres) | M | `resolveDesign` tolérant champ par champ (thème inconnu/hex invalide → thème secteur) |
| RF-07 | Rendu du template par injection chirurgicale sécurisée | M | Tokens type `{{SITE_NAME}}` remplacés ; échappement anti-XSS (`engine.ts`) |
| RF-08 | Upload d'un logo réel (data URL bornée ~300 Ko) | M | Logo intégré au rendu, quota validé |
| RF-09 | Prévisualisation sandbox + code source | M | aperçu si `sandbox`, code avec copie |
| RF-10 | Export `index.html` autonome | M | fichier téléchargeable, ouvrable tel quel |
| RF-11 | Publication en un clic sur Vercel | M | `deployToVercel` REST ; URL `https://{projet}.vercel.app` ; erreur `VERCEL_TOKEN_MISSING` explicite sans jeton |
| RF-12 | URL stable au re-déploiement | M | le slug Vercel est réutilisé → même URL de production |
| RF-13 | Collision de nom (HTTP 409) | S | suffixe aléatoire 4 caractères, slug retourné réutilisable |
| RF-14 | Fiche projet : favoris, suppression, palette, régénération | S | persistance localStorage, actions fonctionnelles |
| RF-15 | Chatbot optionnel intégré au site | S | `supportsChatbot` respecté, rendu conditionnel |
| RF-16 | Auth Google vérifiée ; routes protégées | M | `useRequireAuth`, token signé, hors prod bypass autorisé |
| RF-17 | Rate limiting par session (HMAC) et par IP | M | quotas déployés, dépassement → erreur explicite |
| RF-18 | Rotation signature stable des sessions | S | `RATE_LIMIT_SECRET` stable entre redéploiements |
| RF-19 | Sécurité des logs | M | jamais de jeton/clé dans les logs ; CLI log scrub |
| RF-20 | SEO de la plateforme et des sites générés | S | balises meta, références saines, indexation correcte |
| RF-21 | CI/CD : vérifications automatiques | M | `typecheck`, `lint`, tests, build sur chaque push |

### 3.2 Fiches fonctionnelles détaillées (focus)

#### Fiche : génération (RF-01 → RF-07)

- **Entrée** : `Brief` (Zod) — `siteName`, `sector` (7 secteurs),
  `description`, `palette`, `logo`, `socials` (fb/instagram/whatsapp/email),
  `articles` (max 10), `chatbot`.
- **Pipeline** : server function `generateSite` → `matching.server.ts`
  (prompt SYSTEM incluant `DESIGN_LANGUAGE`) → `generateJson` (LLM) →
  `normalizeResult` (valide/assainit, troncature section) → `engine.ts`
  (render + styles thème via `renderThemeStyle`, polices Google Fonts
  allowlist, surface sombre, effets CSS) → HTML autonome + `MatchResult`.
- **Sortie** : `{ result, siteHtml }` ; si IA indisponible,
  `isFallback: true` + `fallbackReason` affiché à l'utilisateur.

**Fiche : Publication (RF-11 → RF-13)**

- Server fn `deploySite` → `deployToVercel(siteName, html, existingSlug?)`.
- Poll du déploiement jusqu'à `READY` (1,5 s × 8 max) ; 409 → nom suffixé.
- Réponse : `{ url, slug, deployedAt }`. UI : « hébergé par Vercel »,
  extraction du slug existant depuis l'URL pour rester stable.

---

## 4. Exigences non fonctionnelles

### 4.1 Accessibilité et mobile

- Mobile-first ; cibles tactiles ≥ 44 px ; texte ≥ 14 px ; focus visibles ;
  `prefers-reduced-motion` respecté.
- Contraste ≥ 4,5:1 ; respect de 4 à 6 couleurs max ; une seule couleur
  dominante.

### 4.2 Performance

- Génération IA ≤ 30 s (timeout 30 s côté appel, retour sur fallback).
- HTML généré autonome, léger, sans dépendance externe obligatoire.
- Taille du brief bornée (description ≤ 2000 caractères, logo ≤ 450 000
  caractères buffer).

### 4.3 Fiabilité et honnêteté

- Zéro contenu, métrique ou prestation inventée (« anti-slop »).
- Mode dégradé explicite (fallback déterministe) ; jamais de faux dépôt local.
- Version : chaque modification du design restant compatible avec tous les
  templates (resolveDesign permissif).

### 4.4 Sécurité

- Validation stricte côté serveur (Zod).
- Échappement anti-XSS dans `engine.ts` (DOMPurify côté client).
- Auth Google vérifiée ; en dehors de la production, les erreurs Google sont
  contournées pour faciliter les tests. - Hash robuste (PBKDF2 600k) pour les secrets locaux éventuels.
- Jamais de secret dans le dépôt : `.env` gitignoré, seules les variables
  d'exemple dans `.env.example`.
- Rate-limiting par cookie de session signé (HMAC) et par IP.
- Server functions same-origin (anti-CSRF).

### 4.5 Qualité logicielle

- `typecheck`, `lint`, tests, `build` sur chaque commit (AGENTS.md).
- Suite de tests : Hermétiques + e2e réel (hors CI par défaut).
- Test « anti-slop » humain avant livraison (checklist README/AGENTS).

### 4.6 Exploitabilité

- Déploiement plateforme en une commande : `npm run vercel:deploy` (build →
  sync des clés → nitro deploy).
- Variables d'environnement gérables via `npm run vercel:sync` ; une
  modification d'env ne s'applique qu'au prochain déploiement.

---

## 5. Exigences techniques et architecture

### 5.1 Stack (figée)

| Couche | Choix | Remarque |
| --------- | ------------------------------ | ------------------------------ |
| Framework | TanStack Start + React 19 | SSR, routing file-system, server functions |
| Build/CLI | Vite 8 + Nitro (`defaultPreset: "vercel"`) | artefact `.vercel/output` |
| Styles | Tailwind CSS v4 + shadcn/ui (radix, lucide, cmdk, sonner) | tokens et variables CSS |
| Validation | Zod | schémas partagés `brief.ts` |
| IA | SDK `@google/genai` (Gemini), xAI (OpenAI-compatible) | abstraction `llm.server.ts` |
| Tests | Vitest + Testing Library + jsdom | 125 tests hermétiques + e2e |
| SC | GitHub Actions | typecheck/lint/tests/build |

### 5.2 Modules source

```
src/
  routes/          Routing fichier (accueil, wizard, dashboard, projects…)
  lib/
    brief.ts               Schémas Zod + messages d'erreur
    llm.server.ts          Moteur IA multi-provider (Gemini, Grok, fallback)
    matching.server.ts     Choix template + rédaction (DESIGN_LANGUAGE injecté)
    templates/             engine d'injection + templates HTML + registry
    design/                design-language.ts (13 thèmes, 4 genres, FONT_STACKS)
    store.ts               Persistance localStorage
    rate-limit.server.ts   Rate limiting session/IP (HMAC)
    vercel.server.ts       Déploiement statique Vercel (REST v13)
    deploy.functions.ts    Server fn de mise en ligne
  hooks/                   React Query / mutations
scripts/
  sync-vercel-env.mjs      Sync .env → projet Vercel (API REST)
  deploy-vercel.mjs        Pipeline : build → sync → deploy
```

### 5.3 Flux de données (vue macro)

```
User → Brief form → generateSite (server fn)
                    ├─ matching IA (métadonnées templates + brief + DESIGN_LANGUAGE)
                    ├─ generateJson → JSON { templateId, content, design }
                    ├─ normalizeResult + resolveDesign (tolérant)
                    └─ engine.renderSite → HTML autonome
User → deploySite (server fn)
                    └─ deployToVercel → https://{projet}.vercel.app
```

### 5.4 Variables d'environnement

| Variable          | Requis? | Rôle |
|-------------------|--------|------------------------------------|
| `GEMINI_API_KEY`  | oui    | Gemini free (génération principale) |
| `LLM_PROVIDER`    | non    | `gemini` / `grok` |
| `GEMINI_MODEL`    | non    | défaut `gemini-2.5-flash` |
| `XAI_API_KEY`     | non    | Alternative Grok (crédits requis) |
| `LLM_MODEL`       | non    | Défaut `grok-3` |
| `VERCEL_TOKEN`    | oui (mise en ligne) | publication + sync de la plateforme |
| `RATE_LIMIT_SECRET`| conseillée en prod | signature stable des sessions |

> Règle absolue : aucune de ces valeurs ne doit apparaître dans le dépôt
> (*`.env` gitignoré ; `.env.example` contient des valeurs vides*).

---

## 6. Sécurité et protection des données

- **Minimalité** : le brief ne collecte que ce qui est nécessaire à la
  génération. Pas de données de santé, pas de PII.
- **Secrets** : clés uniquement dans `.env` (gitignoré) et dans le tableau de
  bord Vercel ; rotation possible via `npm run vercel:sync`.
- **Entrées** : tous les flux passent par des schémas Zod (validation serveur,
  validation permissive là où il faut, logo borné).
- **Sortie** : HTML assaini ; aucun jeton ni clé dans les logs.
- **Compliance** : conforme à la doctrine d'ingénierie du projet (`AGENTS.md`).

---

## 7. Doctrine UX/Design (non négociable)

Les deux seuls référentiels de la production UI :

1. **Hallmark** (github.com/Nutlope/hallmark) — structure, honnêteté, variété.
2. **UI/UX Pro Max** (github.com/nextlevelbuilder/ui-ux-pro-max-skill) : styles,
   palettes, directives d'implémentation.

Règles d'or appliquées partout :
- Honnêteté éditoriale : jamais de métriques/récompenses inventées ; tout texte
  s'attache au brief ou aux données réelles.
- Variété structurelle : jamais deux pages/sites avec le même rythme.
- Personnalisation des données de chaque brief.
- Typo : max 2 polices (allowlist Google Fonts du projet), jamais de titre en
  italique, hiérarchie stricte.
- Couleurs : 4-6 max, contraste AA, une accent dominante.
- Structure : hero d'abord, sections sectorielles, CTA clair en fin.
- Micro-interactions 200-300 ms, un effet marquant par écran max, zéro
  décoration inutile.

Fichier de vérité : `src/lib/design/design-language.ts` (13 thèmes, 4 genres).

---

## 8. Plan de tests et de validation

**Automatisé (CI)**
- `npm run typecheck`
- `npm run lint`
- `npm test` (suite hermétique — 125 tests)
- `npm run build`

**E2E (hors CI, serveur dev requis)**
- `npx vitest run --config vitest.e2e.config.ts`
  - brief → génération Gemini réelle → `fallback: false`
  - publication réelle Vercel si `VERCEL_TOKEN` présent, sinon étape ignorée.

**Validation manuelle « anti-slop » (avant chaque livraison)**
- Aucun texte générique ni métrique inventée.
- Structure différente des productions précédentes.
- Polices du catalogue, contrastes AA, rendu mobile correct.

---

## 9. Déploiement et exploitation

### 9.1 Plateforme sur Vercel

- `npm run vercel:deploy` : build → `vercel:sync` (clés) → `nitro deploy
  --prebuilt`.
- Si le projet n'existe pas encore, il est créé au nom du package puis reçoit
  les clés **avant** le déploiement.
- Une modification de variable ne s'applique qu'au prochain déploiement
  (jamais en cours de route), ce qu'`npm run vercel:deploy` gère dans le bon
  ordre (build → sync → deploy).

### 9.2 Productions des utilisateurs

- Déploiement statique sur Vercel via l'API REST ; URL stable.
- Re-déploiement du même projet = même URL.

### 9.3 Supervision et qualité

- Logs avec rédaction des secrets, capture centralisée des erreurs
  (`error-capture.ts`).
- Fallback IA : raison d'échec exposée via `lastAiFailureReason()`.

---

## 10. Jalons et planning

| Jalon | Contenu | Statut |
|------|---------|--------|
| MJ-1 — Base technique | Stack TanStack, templates, tests, export | terminé |
| MJ-2 — Moteur IA | Gemini/Grok/fallback, matching, design tokens | terminé |
| MJ-3 — Publication | Migration Vercel (remplacement total Wayhost) | terminé |
| MJ-4 — Plateforme en ligne | `vercel:deploy`, clés synchronisées | en cours |
| MJ-5 — Mise au marché | Démo réelle, prise en main, feedback | à venir |

---

## 11. Matrice des risques

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Clé IA absente ou limite atteinte | Fonctionnel | Moyenne | Fallback déterministe + `lastAiFailureReason`, message clair |
| Indisponibilité de l'API Vercel | Fonctionnel | Moyenne | Poll + timeout 20 s ; erreur métier explicite |
| Collision de nom de projet | Fonctionnel | Moyenne | 409 → suffixe aléatoire |
| Dépassement des quotas (IA / Vercel) | Majeur | Moyenne | Rate limiting par session/IP |
| Échappement XSS | Critique | Faible | DOMPurify + validation stricte |
| Réponse IA imprévisible (format) | Modéré | Moyenne | Validation tolérante + normalisation + fallback |
| Contenu « slop » | Fonctionnel | Moyenne | Doctrine anti-slop, revue humaine, auto-audit |

---

## 12. Critères de recette et définition de fin

Le produit est conforme quand :

1. Un brief réaliste (restaurant, cabinet, boutique…) génère un site conforme
   au design system en < 60 s (`fallback: false`).
2. La publication produit une URL `https://{projet}.vercel.app` publique et
   stable au re-déploiement.
3. Sans jeton Vercel, la publication renvoie une erreur explicite (jamais de
   simulation locale).
4. Exports (HTML autonome, code) opérationnels et fiables.
5. Doctrine `AGENTS.md` respectée : typecheck, lint, tests, build verts ; suite
   e2e verte en serveur dev.
6. Test anti-slop réussi : aucun contenu générique dans le rendu.

---

## 13. Glossaire et références

- **Brief** : liste de demandes utilisateur structurée (formulaire).
- **Slop** : contenu IA générique et vide de sens.
- **Template** : modèle HTML statique de la banque (5) choisi par l'IA.
- **Thème token** : ensemble de couleurs/polices validé (13 thèmes).
- **Fallback** : rendu déterministe par secteur sans clé IA (`isFallback`).
- **Server function (TanStack)** : endpoint serveur exposé au client.
- **URL stable** : `https://{projet}.vercel.app`, conservée au re-déploiement.

Références : `README.md` · `AGENTS.md` · `src/lib/*` ·
github.com/Nutlope/hallmark · github.com/nextlevelbuilder/ui-ux-pro-max-skill