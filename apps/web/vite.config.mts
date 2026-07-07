import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Wrangler config lives at the repo root so the deploy button's
    // provisioning step can detect it (ADR 005).
    cloudflare({ configPath: "../../wrangler.jsonc" }),
  ],
});
