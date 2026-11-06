import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Configuration dédiée aux tests (séparée de vite.config.ts pour ne pas
// charger tailwind / lovable-tagger inutiles en environnement jsdom).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/pages/achat-vente/**",
        "src/services/achatVenteService.ts",
      ],
    },
  },
});
