import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_URL || "/",
  server: {
    host: "::",
    port: 8080,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, "./src")}/`,
      },
    ],
  },
  };
});
