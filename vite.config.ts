import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function localSignupWorkerTarget(rawValue: string | undefined) {
  const value = rawValue?.trim();
  if (!value) return undefined;

  const target = new URL(value);
  const localHostnames = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (target.protocol !== "http:" || !localHostnames.has(target.hostname)) {
    throw new Error(
      "SIGNUP_WORKER_DEV_URL must use http://127.0.0.1, http://localhost, or http://[::1]"
    );
  }

  return target.origin;
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const signupWorkerTarget =
    command === "serve"
      ? localSignupWorkerTarget(env.SIGNUP_WORKER_DEV_URL)
      : undefined;

  return {
    base: env.VITE_BASE_URL || "/",
    server: {
      host: "::",
      port: 8080,
      proxy: signupWorkerTarget
        ? {
            "^/api/niran-storytime-signup$": {
              target: signupWorkerTarget,
              changeOrigin: false,
            },
          }
        : undefined,
    },
    test: {
      environment: "jsdom",
      globals: true,
      maxWorkers: 1,
      minWorkers: 1,
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
