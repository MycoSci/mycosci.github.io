# MycoSci Website

MycoSci is a community-driven portal cataloging the fungal kingdom. The site is built with [Astro](https://astro.build) and styled using [Bootstrap](https://getbootstrap.com) for a clean, professional look. The prior Starlight documentation theme has been removed in favor of a custom Bootstrap interface. Legacy markdown content remains in `src/content/` for future use.

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
