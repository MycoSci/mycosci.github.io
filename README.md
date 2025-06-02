# MycoSci Website

MycoSci is a community-driven portal cataloging the fungal kingdom. The site is built with [Astro](https://astro.build) and styled using [Bootstrap](https://getbootstrap.com) for a crisp, NASA-inspired look. Documentation now lives under `src/pages/docs/` and is served directly on the site without the old Starlight theme. Legacy markdown from earlier experiments is kept in `legacy_docs/` for reference only. Our new design will grow into thousands of dynamic species pages as we map over **100k** mushrooms with a trustworthy interface.

## Development

Run the following commands from the project root:

| Command        | Action                                      |
| :------------- | :------------------------------------------ |
| `npm install`  | Install dependencies                        |
| `npm run dev`  | Start the dev server at `localhost:4321`    |
| `npm run build`| Build the production site in `./dist/`      |
| `npm run preview` | Preview the built site locally            |

## Project Structure

```
.
├── public/          # Static assets
├── src/
│   ├── layouts/     # Reusable page layouts
│   └── pages/       # Site pages
├── src/pages/docs/ # Markdown documentation
├── legacy_docs/    # Old docs kept for reference
├── astro.config.mjs
└── package.json
```

Feel free to contribute new pages or mushroom data as the project grows.

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
