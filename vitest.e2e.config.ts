import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Config dédiée aux tests de bout en bout (serveur dev requis).
 * Usage : `npx vitest run --config vitest.e2e.config.ts`
 * Laisse `npm test` (vitest.config.ts) hermétique.
 */
export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: "node",
    include: ["e2e/**/*.test.ts"],
    server: {
      deps: {
        inline: ["seroval"],
      },
    },
  },
});
