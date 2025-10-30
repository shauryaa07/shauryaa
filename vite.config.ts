import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

async function getReplitPlugins() {
  if (!process.env.REPL_ID) {
    return [];
  }
  
  try {
    const [runtimeError, cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").catch(() => null),
      import("@replit/vite-plugin-cartographer").catch(() => null),
      import("@replit/vite-plugin-dev-banner").catch(() => null),
    ]);
    
    return [
      runtimeError ? runtimeError.default() : null,
      cartographer ? cartographer.cartographer() : null,
      devBanner ? devBanner.devBanner() : null,
    ].filter(Boolean);
  } catch {
    return [];
  }
}

export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(await getReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
