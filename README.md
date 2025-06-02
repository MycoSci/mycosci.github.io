# MycoSci Website

MycoSci is a community-driven portal cataloging the fungal kingdom. The site is built with [Astro](https://astro.build) and styled using [Bootstrap](https://getbootstrap.com) for a crisp, NASA-inspired look. The former Starlight documentation theme was removed in favor of our own Bootstrap layout. Legacy markdown content remains in `src/content/` for future reference.

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
├── src/content/    # Markdown data (legacy docs)
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
- **Lab & Cultivation** – teks and protocols
- **Community** – forums and events
- **Resources** – videos, podcasts, and research links
