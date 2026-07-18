import { defineConfig } from "vite";

const LM_STUDIO_PROXY_PATH = "/lm-studio-api";
const LM_STUDIO_SERVER_URL = "http://127.0.0.1:1234";
const PROXY_PATH_PREFIX_PATTERN = /^\/lm-studio-api/;

export default defineConfig({
  server: {
    proxy: {
      [LM_STUDIO_PROXY_PATH]: {
        target: LM_STUDIO_SERVER_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(PROXY_PATH_PREFIX_PATTERN, ""),
      },
    },
  },
});
