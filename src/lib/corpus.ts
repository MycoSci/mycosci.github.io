// Species corpus -> site. Build-time only; nothing here runs in the browser.
//
// WHERE THE PAGES COME FROM
//   * Narrative pages (data/corpus/pages/*.md) are vendored. They are model-written
//     prose over fetched sources and are NOT reproducible from anything in this repo,
//     so the markdown that publishes is the artifact we keep. The private draft repo
//     MycoSci/mycosci-corpus-draft holds the per-page JSON (prompts, answers, cluster
//     maths) behind each one; data/corpus/MANIFEST.json pins the commit.
//   * Template pages (template-pages/*.md) are NOT vendored. They are regenerated
//     byte-for-byte by scripts/render-template-pages.mjs from committed data, which
//     `npm run data` (prebuild) now does, and they are gitignored.
//
// WHAT THIS FILE WILL NOT DO
//   * It does not edit the page text. The markdown carries its own evidence-basis
//     line, its own danger warning, its own "nothing is known" statement and its own
//     "generated ... model sonnet" provenance footer. Those sentences are the safety
//     property; they render or the page does not. The only thing removed is the
//     leading `# ` title line, because the page template already prints that name as
//     the document's single h1 and two h1s is a document-outline bug, not an edit to
//     what the corpus says.
//   * It does not add a warning glyph, and nothing else in this repo's species chrome
//     may either. In the corpus, U+26A0 means danger and only danger: exactly the 195
//     pages carrying a danger level carry it. A second meaning for the glyph is how
//     that property was broken once already.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const ROOT = process.cwd();
const NARRATIVE_DIR = join(ROOT, 'data', 'corpus', 'pages');
const TEMPLATE_DIR = join(ROOT, 'template-pages');

export type CorpusKind = 'narrative' | 'template';

export interface CorpusPage {
  kind: CorpusKind;
  /** Rendered HTML, title line removed. */
  html: string;
}

function slugsIn(dir: string): Set<string> {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .map((f) => f.slice(0, -3)),
  );
}

const NARRATIVE = slugsIn(NARRATIVE_DIR);
const TEMPLATE = slugsIn(TEMPLATE_DIR);

if (NARRATIVE.size === 0) {
  throw new Error(
    'data/corpus/pages is empty or missing — the species corpus would silently vanish from the build.',
  );
}
if (TEMPLATE.size === 0) {
  throw new Error(
    'template-pages/ is empty or missing — run `node scripts/render-template-pages.mjs` (prebuild does this).',
  );
}

marked.use({ gfm: true, breaks: false });

/** Drop the leading `# ...` line; the page template prints the name as the h1. */
function stripTitle(md: string): string {
  return md.replace(/^#[^\n]*\n+/, '');
}

const cache = new Map<string, CorpusPage | null>();

/**
 * The published page for a slug, or null when the catalog has no page for it
 * (the large majority of the catalog — those fall back to the taxonomy view).
 *
 * A narrative page wins over a template page for the same slug. The template text
 * asserts "this catalog holds no published source describing this species", which is
 * false once a sourced page exists; publishing both would publish a contradiction.
 */
export function corpusPage(slug: string): CorpusPage | null {
  if (cache.has(slug)) return cache.get(slug)!;

  let kind: CorpusKind | null = null;
  let file = '';
  if (NARRATIVE.has(slug)) {
    kind = 'narrative';
    file = join(NARRATIVE_DIR, `${slug}.md`);
  } else if (TEMPLATE.has(slug)) {
    kind = 'template';
    file = join(TEMPLATE_DIR, `${slug}.md`);
  }

  const page: CorpusPage | null = kind
    ? { kind, html: marked.parse(stripTitle(readFileSync(file, 'utf8')), { async: false }) as string }
    : null;

  cache.set(slug, page);
  return page;
}

export const corpusCounts = () => ({
  narrative: NARRATIVE.size,
  template: TEMPLATE.size,
  /** slugs holding both; the narrative page is the one that publishes */
  shadowed: [...TEMPLATE].filter((s) => NARRATIVE.has(s)).length,
});
