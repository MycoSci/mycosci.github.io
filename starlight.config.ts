import { defineConfig } from "@astrojs/starlight/config";

export default defineConfig({
  title: "MycoPedia",
  description:
    "MycoSci field guides, lab protocols, and reference documentation.",
  base: "/docs",
  logo: {
    alt: "MycoSci",
    src: {
      light: "/favicon.svg",
      dark: "/favicon.svg",
    },
  },
  social: {
    github: "https://github.com/MycoSci/mycosci.github.io",
  },
  sidebar: [
    {
      label: "Start Here",
      items: [
        { label: "Overview", link: "/docs/" },
        { label: "Quick Start", link: "/docs/Guides/quick-start/" },
      ],
    },
    {
      label: "Field Guide",
      autogenerate: { directory: "Taxonomy" },
    },
    {
      label: "Cultivation",
      autogenerate: { directory: "cultivation" },
    },
    {
      label: "Lab & Equipment",
      autogenerate: { directory: "lab" },
    },
    {
      label: "Foraging",
      autogenerate: { directory: "foraging" },
    },
    {
      label: "Chemistry & Nutrition",
      autogenerate: { directory: "chemistry-nutrition" },
    },
    {
      label: "Equipment",
      autogenerate: { directory: "equipment" },
    },
    {
      label: "Recipes",
      autogenerate: { directory: "recipes" },
    },
    {
      label: "Research Library",
      autogenerate: { directory: "references" },
    },
    {
      label: "Legacy Reference",
      autogenerate: { directory: "Reference" },
    },
  ],
});
