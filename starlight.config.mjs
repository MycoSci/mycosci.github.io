import { fileURLToPath } from "node:url";

const faviconPath = fileURLToPath(
  new URL("./public/favicon.svg", import.meta.url),
);

/**
 * @type {import('@astrojs/starlight').StarlightConfig}
 */
export default {
  title: "MycoPedia",
  description:
    "MycoSci field guides, lab protocols, and reference documentation.",
  logo: {
    light: faviconPath,
    dark: faviconPath,
  },
  social: {
    github: "https://github.com/MycoSci/mycosci.github.io",
  },
  sidebar: [
    {
      label: "Start Here",
      collapsed: false,
      items: [
        { label: "Overview", link: "/docs/" },
        {
          label: "Orientation Guides",
          autogenerate: { directory: "Guides" },
        },
      ],
    },
    {
      label: "Field Guide",
      collapsed: true,
      items: [
        { label: "Taxonomy Overview", link: "/docs/Taxonomy/" },
        {
          label: "Taxonomy Introduction",
          link: "/docs/Taxonomy/taxonomy-intro/",
        },
        {
          label: "Basidiomycota",
          autogenerate: { directory: "Taxonomy/Basidiomycota" },
        },
        {
          label: "Ascomycota",
          autogenerate: { directory: "Taxonomy/Ascomycota" },
        },
      ],
    },
    {
      label: "Cultivation",
      collapsed: true,
      autogenerate: { directory: "cultivation" },
    },
    {
      label: "Lab & Equipment",
      collapsed: true,
      items: [
        { label: "Lab Protocols", autogenerate: { directory: "lab" } },
        { label: "Equipment Guides", autogenerate: { directory: "equipment" } },
      ],
    },
    {
      label: "Foraging & Safety",
      collapsed: true,
      autogenerate: { directory: "foraging" },
    },
    {
      label: "Chemistry & Nutrition",
      collapsed: true,
      autogenerate: { directory: "chemistry-nutrition" },
    },
    {
      label: "Recipes",
      collapsed: true,
      autogenerate: { directory: "recipes" },
    },
    {
      label: "Research Library",
      collapsed: true,
      autogenerate: { directory: "references" },
    },
    {
      label: "Legacy Reference",
      collapsed: true,
      autogenerate: { directory: "Reference" },
    },
  ],
};
