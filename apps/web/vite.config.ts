import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY ?? "http://localhost:3101",
          changeOrigin: true,
        },
        "/static": {
          target: env.VITE_API_PROXY ?? "http://localhost:3101",
          changeOrigin: true,
        },
      },
    },
  };
});
