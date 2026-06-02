#!/usr/bin/env node
// Consolidate every fungal taxon from the raw sources into ONE canonical data object.
//
//   data/taxonomy.csv   (74k rows)  — canonical catalog; mostly synonym -> accepted mappings
//   data/species.csv    (616 rows)  — curated overlay (hand-picked, named edibles/cultivars)
//   4 hand-written MDX bodies        — promote to tier:'curated' + commonName + edibility
//
// Output: data/species.json — array of one record per unique accepted taxon.
//
// Design notes (see analysis): the .xlsx master is corrupt/redundant and is ignored.
// Dedup key is the accepted binomial (the `Species` column). `Species Name` is the
// query/synonym name and collapses into the accepted taxon's `synonyms` set.
// `slug` and `genus` are derived from the accepted binomial (not the Genus column,
// which is stale for ~6 GBIF-reclassified taxa).

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- tiny RFC-4180-ish CSV parser (handles quotes/commas; data is mostly simple) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readTable(relPath) {
  const rows = parseCSV(readFileSync(join(ROOT, relPath), 'utf8'));
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length > 1 && r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const RANKS = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];

// Map a raw CSV row (with TitleCase headers) into a normalized object.
function norm(row) {
  return {
    speciesName: row['Species Name'] || '',
    accepted: row['Species'] || '',
    kingdom: row['Kingdom'] || '',
    phylum: row['Phylum'] || '',
    class: row['Class'] || '',
    order: row['Order'] || '',
    family: row['Family'] || '',
    genus: row['Genus'] || '',
  };
}

const byKey = new Map(); // dedup key (accepted binomial, or fallback name) -> record

function upsert(row, { source, curated = false }) {
  const r = norm(row);
  const resolved = r.accepted !== '';
  const accepted = resolved ? r.accepted : r.speciesName;
  if (!accepted) return;
  const key = accepted.toLowerCase();

  let rec = byKey.get(key);
  if (!rec) {
    rec = {
      slug: '',                       // assigned after dedup
      accepted,
      genus: accepted.split(/\s+/)[0], // derive from binomial, not stale Genus column
      family: '', order: '', class: '', phylum: '', kingdom: '',
      commonName: null,
      edibility: 'unknown',
      synonyms: new Set(),
      tier: 'stub',
      unresolved: !resolved,
      sources: new Set(),
    };
    byKey.set(key, rec);
  }

  // Fill blank ranks; curated sources override existing values.
  for (const rank of ['family', 'order', 'class', 'phylum', 'kingdom']) {
    if (r[rank] && (curated || !rec[rank])) rec[rank] = r[rank];
  }
  // Collapse the query name into synonyms (unless it equals the accepted name).
  if (r.speciesName && r.speciesName.toLowerCase() !== accepted.toLowerCase()) {
    rec.synonyms.add(r.speciesName);
  }
  if (curated) rec.tier = 'curated';
  if (resolved) rec.unresolved = false;
  rec.sources.add(source);
}

// 1) canonical catalog
for (const row of readTable('data/taxonomy.csv')) upsert(row, { source: 'taxonomy.csv' });
// 2) curated overlay
for (const row of readTable('data/species.csv')) upsert(row, { source: 'species.csv', curated: true });

// 3) the 4 hand-written MDX bodies — promote + attach known metadata (no fabrication)
const CURATED_MDX = {
  'ganoderma lucidum':     { mdx: 'Taxonomy/Basidiomycota/Agaricomycetes/Polyporales/Polyporaceae/Ganoderma/GanodermaLucidum.mdx',     commonName: 'Reishi / Lingzhi', edibility: 'inedible' },
  'cantharellus cibarius': { mdx: 'Taxonomy/Basidiomycota/Agaricomycetes/Cantharellales/Hydnaceae/Cantharellus/CantharellusCibarius.mdx', commonName: 'Golden Chanterelle', edibility: 'edible' },
  'amanita muscaria':      { mdx: 'Taxonomy/Basidiomycota/Agaricomycetes/Agaricales/Amanitaceae/Amanita/AmanitaMuscaria.mdx',              commonName: 'Fly Agaric', edibility: 'toxic' },
  'pleurotus ostreatus':   { mdx: 'Taxonomy/Basidiomycota/Agaricomycetes/Agaricales/Pleurotaceae/Pleurotus/PleurotusOstreatus.mdx',        commonName: 'Oyster Mushroom', edibility: 'edible' },
};
for (const [key, meta] of Object.entries(CURATED_MDX)) {
  const rec = byKey.get(key);
  if (!rec) { console.warn(`! curated MDX taxon not found in data: ${key}`); continue; }
  rec.tier = 'curated';
  rec.commonName = meta.commonName;
  rec.edibility = meta.edibility;
  rec.mdxPath = meta.mdx;
  rec.sources.add('mdx');
}

// --- finalize: assign collision-safe slugs, freeze sets to sorted arrays ---
const records = [...byKey.values()].sort((a, b) => a.accepted.localeCompare(b.accepted));
const usedSlugs = new Map();
for (const rec of records) {
  let base = slugify(rec.accepted), slug = base, n = 1;
  while (usedSlugs.has(slug)) slug = `${base}-${++n}`;
  usedSlugs.set(slug, true);
  rec.slug = slug;
  rec.synonyms = [...rec.synonyms].sort();
  rec.sources = [...rec.sources].sort();
}

const bySlug = new Map(records.map((r) => [r.slug, r]));

// 4) curated overrides — per-species enrichment merged in by slug (data/curated/*.json).
// This is how phase-1+ data lands without touching the raw CSVs. Each file is a partial
// SpeciesRecord; non-empty keys win, the taxon is promoted to curated, and provenance is noted.
const PROTECTED = new Set(['slug', 'accepted', 'genus', 'sources', 'tier']);
const curatedDir = join(ROOT, 'data/curated');
let overridden = 0;
if (existsSync(curatedDir)) {
  for (const file of readdirSync(curatedDir).filter((f) => f.endsWith('.json'))) {
    const patch = JSON.parse(readFileSync(join(curatedDir, file), 'utf8'));
    const rec = bySlug.get(patch.slug || file.replace(/\.json$/, ''));
    if (!rec) { console.warn(`! curated override has no matching taxon: ${file}`); continue; }
    for (const [k, v] of Object.entries(patch)) {
      if (PROTECTED.has(k)) continue;
      if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) continue;
      rec[k] = v;
    }
    rec.tier = 'curated';
    if (!rec.sources.includes('curated')) { rec.sources.push('curated'); rec.sources.sort(); }
    overridden++;
  }
}

// Safety invariant: dangerousLookalikes must be reciprocal. If A lists B (by slug),
// ensure B lists A — a one-way warning is a trap for the user coming from the other side.
let reciprocated = 0;
for (const rec of records) {
  for (const la of rec.dangerousLookalikes || []) {
    const other = la.slug && bySlug.get(la.slug);
    if (!other) continue;
    other.dangerousLookalikes ??= [];
    if (!other.dangerousLookalikes.some((x) => x.slug === rec.slug)) {
      // Don't copy A's note verbatim — written from A's page it reads wrong on B's.
      // Use a neutral, perspective-correct pointer that names A and its edibility.
      other.dangerousLookalikes.push({
        slug: rec.slug,
        name: rec.accepted,
        note: `Confusable with ${rec.accepted} (${rec.edibility}). See its profile for how to tell them apart.`,
      });
      if (other.tier !== 'curated') other.tier = 'curated';
      reciprocated++;
    }
  }
}

// Baseline description for every taxon that lacks one — a plain restatement of its
// verified taxonomy (no fabrication). Curated/enriched descriptions are preserved.
const baselineDescription = (r) => {
  const ranks = [];
  if (r.genus) ranks.push(`genus ${r.genus}`);
  if (r.family) ranks.push(`family ${r.family}`);
  if (r.order) ranks.push(`order ${r.order}`);
  if (r.class) ranks.push(`class ${r.class}`);
  if (r.phylum) ranks.push(`phylum ${r.phylum}`);
  const tail = ranks.length ? ` in the ${ranks.join(', ')}` : '';
  return `${r.accepted} is a species of fungus${tail}.`;
};
let baselined = 0;
for (const rec of records) {
  if (!rec.description) {
    rec.description = baselineDescription(rec);
    rec.descriptionAuto = true; // flag: auto-generated from taxonomy, not curated prose
    baselined++;
  }
}

writeFileSync(join(ROOT, 'data/species.json'), JSON.stringify(records));

// --- report ---
const resolved = records.filter((r) => !r.unresolved).length;
const curated = records.filter((r) => r.tier === 'curated').length;
const synonyms = records.reduce((n, r) => n + r.synonyms.length, 0);
const blankFamily = records.filter((r) => !r.family).length;
console.log('=== consolidation complete ===');
console.log(`unique taxa        : ${records.length}`);
console.log(`  resolved         : ${resolved}`);
console.log(`  unresolved       : ${records.length - resolved}`);
console.log(`  curated tier     : ${curated}`);
console.log(`synonyms collapsed : ${synonyms}`);
console.log(`curated overrides  : ${overridden} (+${reciprocated} reciprocal lookalikes)`);
console.log(`baseline descriptions added : ${baselined}`);
console.log(`blank family       : ${blankFamily}`);
console.log(`-> data/species.json (${(JSON.stringify(records).length / 1e6).toFixed(1)} MB)`);
