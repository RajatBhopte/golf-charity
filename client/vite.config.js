import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router-dom/")
          ) {
            return "react";
          }

          if (id.includes("/framer-motion/")) return "motion";
          if (id.includes("/lucide-react/")) return "icons";
          if (id.includes("/@supabase/supabase-js/")) return "supabase";
          if (id.includes("/@stripe/stripe-js/")) return "stripe";

          return "vendor";
        },
      },
    },
  },
});
