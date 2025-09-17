// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import starlight from "@astrojs/starlight";
import starlightConfig from "./starlight.config.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://mycosci.com",
  integrations: [mdx(), starlight(starlightConfig)],
});
