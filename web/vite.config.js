import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base + HashRouter => works on GitHub Pages project sites
// (https://user.github.io/REPO/) with no server-side rewrites needed.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
