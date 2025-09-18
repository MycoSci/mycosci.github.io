// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import starlightConfig from "./starlight.config.mjs";

const integrations = [mdx()];
const alias = {};

try {
  const { default: starlight } = await import("@astrojs/starlight");
  integrations.push(starlight(starlightConfig));
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code !== "ERR_MODULE_NOT_FOUND"
  ) {
    throw error;
  }
  console.warn(
    "[@astrojs/starlight] integration not available; continuing without it.",
  );
  alias["@astrojs/starlight/components"] = fileURLToPath(
    new URL("./src/components/starlight/index.ts", import.meta.url),
  );
}

// https://astro.build/config
export default defineConfig({
  site: "https://mycosci.com",
  base: "/docs",
  integrations,
  vite: {
    resolve: {
      alias,
    },
  },
});
