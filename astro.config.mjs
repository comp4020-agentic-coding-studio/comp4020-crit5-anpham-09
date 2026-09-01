// @ts-check
import { defineConfig } from "astro/config";

// The deployed site lives under a path, not at a domain root:
// https://comp4020-agentic-coding-studio.github.io/comp4020-crit5-anpham-09/
// Astro needs `base` set explicitly. Getting it wrong looks perfect locally
// and 404s every asset on the live URL, so treat these two lines as part of
// the deploy contract, not as cosmetics.
export default defineConfig({
  site: "https://comp4020-agentic-coding-studio.github.io",
  base: "/comp4020-crit5-anpham-09",
  // Astro's default, stated out loud because the invariants in spec/ and the
  // CI links check both read the built site from here.
  outDir: "./dist",
});
