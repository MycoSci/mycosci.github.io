# MycoSci Documentation

MycoSci provides open references for mushroom identification, cultivation, and laboratory work. The site now runs on the default [Astro Starlight](https://starlight.astro.build/) theme with no custom CSS so content renders exactly as Starlight intends.

## Development

Install dependencies and start the Starlight dev server from the project root:

| Command           | Action                                   |
| :---------------- | :--------------------------------------- |
| `npm install`     | Install dependencies                     |
| `npm run dev`     | Start the dev server at `localhost:4321` |
| `npm run build`   | Build the production site in `./dist/`   |
| `npm run preview` | Preview the built site locally           |

## Project Structure

```
.
├── public/               # Static assets served as-is
├── src/
│   ├── content/          # Markdown and MDX documentation
│   └── content.config.ts # Content collections for Astro
├── astro.config.mjs      # Astro configuration with Starlight integration
├── starlight.config.mjs  # Site metadata and sidebar configuration
├── template_species.md   # Authoring helper for new species entries
├── template.md           # Generic content template
├── template_index.md     # Outline for index pages
└── fill_prompt.md        # Worksheet for species data entry
```

## Content

All published material lives in `src/content/docs/` and is organized into directories that Starlight autogenerates in the sidebar. Add new Markdown or MDX files inside these folders to extend the documentation. Static datasets (CSV and JSON files) that support the docs live alongside the content for now so contributors can continue working with them.

Refer to `AGENTS.md` for repository guidelines before contributing changes.
