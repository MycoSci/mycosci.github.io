# MycoSci

Open-source mycology project: free, community-built. Goal is a complete catalog of fungal species (we have ~80–100k taxa resolved as raw data), a deep-search interface, an Instagram-style visual discovery feed (MycoGram), cultivation and lab teks, and educational data-sci visualizations of fungal genetics — gene maps, process maps, senescence/drift over generations.

Live: https://mycosci.com — deployed via GitHub Pages.

This document is the working source of truth for the repo as it actually is, not as it was once planned. Keep it honest. When something here drifts from reality, fix it.

---

## 1. State of the repo (2026-04)

The codebase is being refreshed from the ground up. Treat older scaffolding as suspect until verified.

What actually exists:

- **Frontend:** Astro 5.6.1, MDX, Tailwind 3. No Starlight (the import path `@astrojs/starlight/components` is aliased in `astro.config.mjs` to local shims in `src/components/docs/`). No React, no D3, no TensorFlow.js are installed.
- **Content:** 904 species MDX stubs under `src/content/docs/Taxonomy/{Phylum}/{Class}/{Order}/{Family}/{Genus}/`, generated from a CSV. Quality is shallow — most are placeholder profiles.
- **Raw data:** `data/species.xlsx` is the canonical source. Working CSVs (`species.csv`, `taxonomy.csv`, `skipped_rows.csv`) and the Python ingestion scripts (`csv_pop.py`, `test.py`) live alongside it in `data/`. None of this is served — it's build-time input only.
- **Routes:** `src/pages/` has skeleton pages for `database/`, `shop/`, `detect/`, `gene-bank/`, `account/`, `blog/`, `about/`, `api/`, `cart/`. Most are not wired to real data.
- **Deploy:** `.github/workflows/astro.yml` builds and pushes `dist/` to GitHub Pages.
- **`ai/`** — scaffolding only. No trained model, no data pipeline implemented. README describes the intended MobileNetV3 plan.
- **`wordpress/`** — local docker-compose. Not currently deployed; the headless-WP backend is a future option, not a live dependency.

Cleanup debts to be aware of:
- The Starlight shim in `src/components/docs/` is local-only — treat it as our component library. Don't import from `@astrojs/starlight/*` outside what the alias exposes; if you need a new component, add it to the shim.
- `src/data/*.json` (`authors.json`, `forum.json`, `leaderboard.json`, `posts.json`, `species.json`) is mock data — flag before treating as truth.
- Most species MDX files are stubs generated from the CSV. Treat them as scaffolding; the long-term plan (§3) is to render from a data file rather than maintain 80k MDX files.

---

## 2. Mission and scope

Pillars, in priority order:

1. **Catalog.** Every fungal species with a stable URL, taxonomy, and as much sourced detail as we can verify. Scale target: 80k+ taxa. Quality varies by stub depth — aim for "accurate skeleton everywhere, deep where we have data."
2. **Deep search.** Faceted lookup across taxonomy, morphology, ecology, edibility, distribution, genetic markers. Should work on a static build at this scale (prebuilt index, client-side search).
3. **MycoGram.** Visual-first discovery feed — image grid, infinite scroll, links into the catalog. Static-first; user uploads come later if/when there's a backend.
4. **Cultivation & lab teks.** Clear, opinionated guides: agar, LC, grain, fruiting, contamination ID, sterile technique. Process diagrams beat prose.
5. **Gene science education.** Visualize and explain ITS/LSU markers, phylogeny, why cultures senesce, why isolates drift across generations, how to manage gene banks. This is the differentiator — most mycology sites don't go here.

Non-goals (right now): payments, subscriptions, user accounts, mobile apps. The old CLAUDE.md described a WooCommerce/Stripe/gene-storage SaaS. That can be a future layer; it's not what this OSS contribution is.

---

## 3. Framework: Astro, with a hybrid render strategy

Decision: **stay on Astro.** GitHub Pages is static-only, and the realistic alternatives (Qwik, Hugo, 11ty) don't beat Astro enough on this site's mix of static catalog + interactive UI to justify a port. Switching costs throw away the existing content pipeline; the actual problem is not the framework, it's how we're using it.

The real constraint is volume. Pre-rendering 80–100k species pages on every push will hit GitHub Actions / Pages build limits. The plan:

1. **Stop generating one MDX per species.** A species is data, not a document. Replace the per-species MDX files with a single dynamic route — `src/pages/species/[slug].astro` — backed by a structured data file built from `data/species.xlsx`.
2. **Tier the rendering.**
   - **Pre-rendered (static):** species with curated, sourced detail. Hundreds today, growing into low thousands. These are the "loved" pages with images, microscopy, look-alikes, etc. Pre-render via `getStaticPaths` so they're indexable and fast.
   - **Client-rendered fallback:** the long-tail catalog (tens of thousands of skeleton entries). One static `/species/[slug]` route that fetches the entry from a sharded JSON manifest at runtime. Indexable enough via the search index; build cost is one route, not 80k.
   - **Promotion path:** once a long-tail entry gets curated, it joins the pre-rendered tier. No code change needed beyond a flag in the data file.
3. **Shard the data.** `public/data/species/{shard}.json` (e.g. by first letter of slug) keeps any single fetch under ~200KB.
4. **Search index** built from the same data file (Pagefind for the static tier, a custom MiniSearch/Orama index for the long tail). Built once, served as static assets.
5. **Editorial content** (guides, teks, blog, gene-science explainers) stays in `src/content/docs/` as MDX. That's where MDX earns its keep.

Net effect: build time scales with curated content, not catalog size. We can have 100k taxa indexed without a 100k-page build.

This migration is incremental. The 904 existing MDX files keep working until we cut over.

---

## 4. Dev commands

```bash
npm install        # install deps
npm run dev        # dev server at http://localhost:4321
npm run build      # static build to dist/
npm run preview    # preview built dist/
```

Node 18+. No test suite yet. CI runs `npm ci && npx playwright install && npm run build`.

---

## 5. Project structure (current)

```
mycosci.github.io/
├── src/
│   ├── pages/                 # Astro routes (skeleton pages mostly)
│   ├── components/
│   │   ├── docs/              # Starlight-API shim (Card, Tabs, Aside, etc.)
│   │   └── CartButton.astro
│   ├── content/
│   │   ├── docs/              # 904 species MDX + section landing pages
│   │   │                      # ⚠️ also contains raw CSVs that should move
│   │   └── ...
│   ├── content.config.ts      # collection schema (taxonomy + edibility fields)
│   ├── layouts/BaseLayout.astro
│   ├── lib/
│   │   ├── cart.ts
│   │   └── wordpress.ts       # GraphQL client (unused until WP is live)
│   ├── data/                  # JSON — mostly mock data, do not trust
│   └── styles/
├── data/
│   └── species.xlsx           # master spreadsheet (the real source data)
├── ai/                        # training scaffolding only, no model
├── wordpress/                 # local docker-compose (optional dev)
├── public/                    # static assets
├── astro.config.mjs
├── tailwind.config.mjs
└── .github/workflows/astro.yml
```

---

## 6. Content model

### Species frontmatter (current schema, `src/content.config.ts`)

```ts
{
  title: string,
  description?: string,
  author?: string,
  pubDate?: Date,
  tags?: string[],
  kingdom?, phylum?, class?, order?, family?, genus?, species?: string,
  commonName?: string,
  edibility?: 'edible' | 'inedible' | 'toxic' | 'psychoactive' | 'unknown',
  habitat?: string,
  distribution?: string,
}
```

This schema is intentionally minimal. The richer fields (morphology, microscopy, DNA accessions, ecology, toxicity, look-alikes) belong in the body. If we move to data-driven rendering, push the structured fields into the schema and the body becomes the long-form description.

### Taxonomy path convention

`src/content/docs/Taxonomy/{Phylum}/{Class}/{Order}/{Family}/{Genus}/{species-slug}.mdx`

Each rank has an `index.mdx` with `sidebar.order: -1`. Slugs use the species epithet, lowercase, hyphens for spaces.

### Doc components

Use the local shims from `src/components/docs/` (re-exported via the `@astrojs/starlight/components` alias). Available: `Card`, `CardGrid`, `Tabs`, `TabItem`, `Badge`, `Aside`, `Steps`, `LinkButton`, `Icon`, `TaxonomyChildren`. Don't add new Starlight imports without updating the shim — it's not a real dependency.

---

## 7. Active workstreams

When picking up work, these are the live threads, roughly in order:

1. **Build the data layer.** Convert `data/species.xlsx` → sharded JSON in `public/data/species/`. One row per taxon, with a `tier: 'curated' | 'stub'` flag. This unblocks everything below.
2. **Add the dynamic species route.** `src/pages/species/[slug].astro` — `getStaticPaths` returns curated taxa for pre-render, fallback fetches from the JSON shards client-side.
3. **Migrate the existing 904 MDX stubs** into the data file as `tier: 'stub'`. Keep MDX only where someone has actually written content; delete the empty shells.
4. **Wire up search.** Pagefind over the curated tier; a MiniSearch/Orama index over the data file for the long tail. Single search box, both sources.
5. **MycoGram MVP** — image grid backed by a static manifest. Source images legally (iNaturalist research-grade, GBIF, CC-BY contributions). Don't ship without attribution metadata.
6. **Gene-science explainer pages** — phylogeny, senescence, drift. Content tasks first; visualizations come once the writing is solid.

---

## 8. Contribution guide

- Build must pass: `npm run build` is the gate.
- Don't edit `dist/` or `node_modules/`.
- Commits: short `type: description`. Examples in `git log`.
- Species edits: keep the taxonomy path correct. If you're adding a new genus/family, add the index file with `sidebar.order: -1`.
- New routes go under `src/pages/`. New shared UI under `src/components/`. Logic that touches data goes in `src/lib/`.
- Don't import from `@astrojs/starlight/*` outside of `components/` paths that exist in our shim — it'll break the build.
- This is volunteer/community work. Kindness over correctness in PR reviews; correctness still required in `main`.

---

## 9. For AI assistants working in this repo

- The user is the maintainer; treat them as the technical lead.
- Default to **honest minimums** over speculative scaffolding. If a system isn't built (WordPress, AI model, payments), don't write code that pretends it is.
- When asked to add a species, don't generate fake DNA accessions, fake type localities, or fake authority citations. Leave fields blank or use `unknown` rather than fabricate. Real sources: IF (Index Fungorum), MycoBank, GBIF, NCBI.
- When asked to scale content (e.g. "generate 1000 species pages from the CSV"), confirm the rendering model first — generating 1000 more MDX stubs makes the build problem worse.
- The old CLAUDE.md described an e-commerce + SaaS architecture. Those plans are deprioritized; don't reintroduce them unless asked.
- Edibility/toxicity is a safety-relevant claim. If unsure, mark `unknown` and surface a `caution` Aside. Never auto-classify a species as edible without a verifiable source.
