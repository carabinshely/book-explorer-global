import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const fixViteEnvImport = () => ({
  name: "fix-vite-env-import",
  enforce: "pre",
  transform(code: string, id: string) {
    if (id.endsWith("/node_modules/vite/dist/client/client.mjs")) {
      return code.replace('import "@vite/env";', 'import "/@vite/env";');
    }
    return null;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  base: command === "build" ? "/book-explorer-global/" : "/",
  server: {
    host: "::",
    port: 8080,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  plugins: [
    fixViteEnvImport(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, "./src")}/`,
      },
    ],
  },
}));
