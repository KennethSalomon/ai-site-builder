export type Palette = { id: string; label: string; swatch: string[] };

export const PALETTES: Palette[] = [
  { id: "violet", label: "Violet", swatch: ["#7c3aed", "#a78bfa", "#1e1b2e"] },
  { id: "ocean", label: "Océan", swatch: ["#0ea5e9", "#22d3ee", "#0b1f2a"] },
  { id: "forest", label: "Forêt", swatch: ["#16a34a", "#86efac", "#0f1f16"] },
  { id: "sunset", label: "Coucher de soleil", swatch: ["#f97316", "#fbbf24", "#2a160b"] },
  { id: "mono", label: "Monochrome", swatch: ["#e5e5e5", "#a3a3a3", "#111111"] },
];

export const findPalette = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
