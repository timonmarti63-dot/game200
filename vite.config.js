import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works when served under a subpath
  // (e.g. deploy_website's S3 proxy). GitHub Pages / itch.io serve the same way.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
