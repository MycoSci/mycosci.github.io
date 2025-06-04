# MycoSci Website

MycoSci is building a comprehensive portal to catalog the fungal kingdom. The site
uses [Astro](https://astro.build) and [Bootstrap](https://getbootstrap.com) to deliver a clean, NASA-inspired interface.
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

## Project Structure

```
.
├── public/          # Static assets
├── src/
│   ├── components/  # UI pieces
│   ├── layouts/     # Page layouts
│   ├── pages/       # Astro pages
│   └── content/     # Legacy markdown docs
├── src/data/       # JSON seeds for authors, posts and species
├── template_species.md    # Template for species pages
├── fill_prompt.md   # Data entry fields
├── astro.config.mjs
└── package.json
```

Feel free to contribute new pages or mushroom data as the project grows. See `AGENTS.md` for contribution guidelines.

## Community Features

The community section includes a simple forum scaffold with a sign-in page and leaderboard. You can view a sample user profile and browse discussion threads. These pages live under `src/pages/community` and the related UI components are in `src/components`.

## Navigation Overview

The site features a Bootstrap-powered navbar linking to key sections:

- **Explore** – maps and identification tools
- **Visual Gallery** – community photos
- **Mushroom Instagram** – MycoGram feed
- **MycoPedia** – species profiles and taxonomy
- **Docs** – guides and reference material
- **Lab & Cultivation** – teks and protocols
- **Community** – forums and events
- **Resources** – videos, podcasts, and research links
- **Blog** – news articles and tutorials
- **Author Directory** – bios of contributors
