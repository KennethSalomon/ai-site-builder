# Playwright MCP — Protocole de vérification par section

> À exécuter APRÈS CHAQUE SECTION codée. Ne jamais batcher toutes les sections avant de vérifier.

## Pré-requis

- `opencode.jsonc` contient :
  ```json
  "mcp": { "playwright": { "type": "local", "command": ["npx", "-y", "@playwright/mcp"], "enabled": true } }
  ```
- Dev server actif (`npm run dev` → http://localhost:3000)

## Séquence exacte (MCP)

1. **Navigate** — `browser_navigate` vers la route cible
2. **Screenshot section** — `browser_take_screenshot` (fullPage: false, cibler la section si possible) + `browser_snapshot` pour l'arbre a11y
3. **Resize mobile** — `browser_resize` 375x812, re-screenshot, vérifier pas de scroll horizontal
4. **Resize desktop** — 1280x800, re-screenshot
5. **Évaluer** (via `browser_evaluate` si besoin) :
   - `getComputedStyle` contraste, `document.activeElement` focus, `prefers-reduced-motion`

## Checklist visuelle (à cocher mentalement)

- [ ] **Typo** : 2 polices max (DESIGN_THEMES), h1 balance/pretty, line-height 1.5, ≥14px body, pas d'italique titre
- [ ] **Couleur** : 4-6 couleurs, 1 accent, contraste ≥4.5:1, dark mode si prévu (`color-scheme`)
- [ ] **Spacing** : grille 8pt, rayons/bordures cohérents (var CSS), pas de gap aléatoire
- [ ] **Mobile** : pas de débordement, cibles ≥44px, 8px+ entre interactifs, images responsive (clamp + srcset)
- [ ] **A11y** : focus-visible, aria-label sur icon-only, headings hiérarchiques, skip link, alt, aria-live si toast
- [ ] **Motion** : `transform`/`opacity` only, 200-300ms, `prefers-reduced-motion` géré, pas de `transition: all`
- [ ] **Perf** : images `width`/`height` + lazy (hors hero), pas de layout read en render, pas de CLS
- [ ] **Contenu** : pas de métrique/copy générique — tout relié au brief/données réelles (Hallmark)
- [ ] **Structure** : rythme différent des livraisons précédentes (Hallmark variété)

## En cas d'écart

- Micro-edit immédiat (batch si N défauts), puis **re-screenshot** jusqu'à vert
- Max 2 passes par section (build → fix batch → confirm) — au-delà, on brûle du budget pour rien

## Fallback sans MCP

```bash
npx playwright screenshot http://localhost:3000/<route> --viewport-size="1280,800" screenshot-desktop.png
npx playwright screenshot http://localhost:3000/<route> --viewport-size="375,812" screenshot-mobile.png
```
