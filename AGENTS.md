# GuardSite AI

> [!IMPORTANT]
> This project is generated and maintained by the **GuardSite AI** team
> (Kenneth, Thed & Primaëlle) for the EPITNET 2026 hackathon. Keep the branch
> in a working state: verify typecheck, lint, tests and build before pushing.

## Design doctrine (implacable)

Les **deux seuls référentiels design** du projet — toute production UI (pages de l'app,
composants, sites générés) doit s'y conformer, sans exception :
1. **Hallmark** (github.com/Nutlope/hallmark) — structure, honnêteté, variété : doctrine anti-slop.
2. **UI/UX Pro Max** (github.com/nextlevelbuilder/ui-ux-pro-max-skill) — styles UI, palettes, directives d'implémentation.

### Règles d'or (non négociables)
1. **Honnêteté éditoriale** — jamais de métriques, récompenses ou preuves sociales inventées ; jamais de copie passe-partout (« partenaire de confiance », « à votre service ») quand les données réelles permettent mieux. Tout texte se rattache au brief ou aux données réelles.
2. **Variété structurelle** — deux pages / deux sites ne partagent jamais le même rythme (même hero, même enchaînement de sections, mêmes composants) : varier l'ordre, l'angle, le ton.
3. **Personnalisation** — exploiter chaque donnée disponible (nom, produits réels, socials, e-mail) pour différencier le rendu.
4. **Typographie** — max 2 polices (titres + texte), jamais de titre en italique, hiérarchie stricte ; réutiliser les paires du catalogue.
5. **Couleurs** — 4 à 6 couleurs max, contraste ≥ 4.5:1, une seule accent dominante.
6. **Structure** — hero d'abord, sections adaptées au secteur, CTA clair en fin.
7. **Accessibilité & mobile** — mobile-first, cibles tactiles ≥ 44px, texte ≥ 14px, focus visibles, `prefers-reduced-motion` respecté.

### Genres (détecter le genre avant tout)
- **editorial** — serif affirmé, ton magazine (alimentation, beauté, mode, artisanat, culture).
- **modern-minimal** — espace blanc, grille stricte, un seul accent (médecine, services, B2B, SaaS).
- **atmospheric** — surfaces sombres, lueurs, ambiance marquée (électronique, tech, gaming, musique, studios).
- **playful** — couleurs franches, angles assumés (marques jeunes, événementiel, enfance, street-food).

### Tokens du projet (ne jamais inventer de palette ou de police ad hoc)
- Les 13 thèmes de `src/lib/design/design-language.ts` (`DESIGN_THEMES`) : accents, paires de polices, effets CSS, `darkSurface` — toujours les réutiliser.
- `FONT_STACKS` = allowlist Google Fonts du projet (15 polices).
- Sites générés par IA : `DESIGN_LANGUAGE` est injecté dans les prompts de `matching.server.ts` — ne pas contourner ce référentiel.

### Directives d'implémentation (UI/UX Pro Max)
- Grille lisible, espacement rythmique, rayons et bordures cohérents via variables CSS.
- Micro-interactions 200–300 ms, hovers discrets, zéro décoration inutile.
- Un effet marquant par écran maximum (aurora, glow, verre dépoli) — le reste sobre.

### Avant de livrer (test anti-slop)
Vérifier : aucun texte générique, aucune métrique inventée, structure différente des productions précédentes, polices du catalogue, contrastes respectés, rendu mobile correct.
