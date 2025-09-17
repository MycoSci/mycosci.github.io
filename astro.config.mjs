// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let hasStarlight = false;
let starlightIntegration;

try {
  const mod = await import("@astrojs/starlight");
  starlightIntegration = mod.default;
  hasStarlight = typeof starlightIntegration === "function";
} catch (error) {
  console.warn(
    "[astro.config] @astrojs/starlight is not installed; /mycopedia will show installation instructions instead of the docs shell.",
  );
}

const alias = {};

try {
  require.resolve("@astrojs/starlight/components");
} catch {
  alias["@astrojs/starlight/components"] =
    "./src/components/starlight/index.ts";
}

// https://astro.build/config
export default defineConfig({
  site: "https://mycosci.com",
  integrations: [
    mdx(),
    ...(starlightIntegration ? [starlightIntegration()] : []),
  ],
  vite: {
    resolve: {
      alias,
    },
    define: {
      "import.meta.env.STARLIGHT_ENABLED": JSON.stringify(hasStarlight),
    },
  },
});
