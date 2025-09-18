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
      items: [{ label: "Overview", link: "/" }],
    },
    {
      label: "Guides",
      autogenerate: { directory: "Guides" },
    },
    {
      label: "Taxonomy",
      autogenerate: { directory: "Taxonomy" },
    },
    {
      label: "Cultivation",
      autogenerate: { directory: "cultivation" },
    },
    {
      label: "Lab & Equipment",
      items: [
        { label: "Lab Protocols", autogenerate: { directory: "lab" } },
        { label: "Equipment Guides", autogenerate: { directory: "equipment" } },
      ],
    },
    {
      label: "Foraging & Safety",
      autogenerate: { directory: "foraging" },
    },
    {
      label: "Chemistry & Nutrition",
      autogenerate: { directory: "chemistry-nutrition" },
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
    {
      label: "Community",
      items: [
        { label: "Blog", autogenerate: { directory: "blog" } },
        { label: "Gallery", link: "/gallery/" },
        { label: "MycoGram", link: "/mycogram/" },
        { label: "Resources", link: "/resources/" },
      ],
    },
  ],
};
