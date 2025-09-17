# MycoSci Website

MycoSci is building a comprehensive portal to catalog the fungal kingdom. The site
uses [Astro](https://astro.build) and [Bootstrap](https://getbootstrap.com) to deliver a crisp, mission-inspired interface.
Legacy markdown content remains in `src/content/` while the new layout will scale to thousands of dynamic species pages as we map over **100k** mushrooms.

## Project Goals

- Document a vast catalog of fungi with reliable taxonomy and identification info
- Offer research, cultivation and community resources in one place
- Encourage contributions of photos, notes and corrections from enthusiasts

## Development

Run the following commands from the project root:

| Command           | Action                                   |
| :---------------- | :--------------------------------------- |
| `npm install`     | Install dependencies                     |
| `npm run dev`     | Start the dev server at `localhost:4321` |
| `npm run build`   | Build the production site in `./dist/`   |
| `npm run preview` | Preview the built site locally           |

> **Starlight docs**: The repository now bundles the official Starlight documentation shell. The `/docs` routes are available out of the box when you run `npm run dev` or build for production.

## Project Structure

```
.
├── public/          # Static assets
├── src/
│   ├── components/  # UI pieces
│   ├── layouts/     # Page layouts
│   ├── pages/       # Astro pages
│   ├── content/     # Shared markdown/MDX docs
│   └── env.d.ts     # Astro ambient type declarations
├── starlight.config.ts # Optional Starlight site configuration
├── src/data/       # JSON seeds for authors, posts and species
├── template_species.md    # Template for species pages
├── fill_prompt.md   # Data entry fields
├── astro.config.mjs
└── package.json
```

Feel free to contribute new pages or mushroom data as the project grows. See `AGENTS.md` for contribution guidelines.

## Community Features

The forum, profile, and leaderboard prototypes remain in `src/components`, but the community pages have been removed from the current build while the experience is reworked. You can reference the existing components if you want to explore the scaffold offline.

## Navigation Overview

The site features a Bootstrap-powered navbar linking to key sections:

- **Visual Gallery** – community photos
- **Mushroom Instagram** – MycoGram feed
- **MycoPedia** – official documentation portal powered by Astro Starlight (`/docs`)
- **Lab & Cultivation** – teks and protocols
- **Resources** – videos, podcasts, and research links
- **Blog** – news articles and tutorials
- **Author Directory** – bios of contributors
