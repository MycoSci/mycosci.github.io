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

// 3.5) GBIF overlay — fills authorship/year/registry.gbif/vernacular from the GBIF Backbone
// (data/gbif.json, built by scripts/build-gbif.mjs). Runs BEFORE curated overrides so any
// hand-curated value always wins. Partial gbif.json is fine — it fills whatever it has.
if (existsSync(join(ROOT, 'data/gbif.json'))) {
  const gbif = JSON.parse(readFileSync(join(ROOT, 'data/gbif.json'), 'utf8'));
  let gbifFilled = 0;
  for (const rec of records) {
    const g = gbif[rec.slug];
    if (!g || g.error || !g.gbifKey) continue;
    let touched = false;
    if (g.authorship && !rec.authorship) { rec.authorship = g.authorship; touched = true; }
    if (g.year && !rec.year) { rec.year = g.year; touched = true; }
    rec.registry ??= {};
    if (!rec.registry.gbif) { rec.registry.gbif = String(g.gbifKey); touched = true; }
    if (g.vernacular?.length) {
      if (!rec.commonName) rec.commonName = g.vernacular[0];
      if (!rec.vernacularNames?.length) rec.vernacularNames = g.vernacular.map((n) => ({ name: n, lang: 'en' }));
      touched = true;
    }
    if (touched && !rec.sources.includes('gbif')) { rec.sources.push('gbif'); rec.sources.sort(); }
    if (touched) gbifFilled++;
  }
  console.log(`gbif overlay filled : ${gbifFilled}`);
}

// 3.6) Backbone-refresh overlay — whole records for taxa that are in the GBIF/IF backbones
// but absent from the CSVs, plus synonym aliases that make an existing record findable under
// a name people actually search for (data/backbone-refresh.json, built 2026-09-18).
//
// Additive only, in the same spirit as the GBIF overlay above:
//   * a record is inserted only if its slug does not already exist;
//   * a slug/accepted-name collision ABORTS the build rather than auto-suffixing, because a
//     collision means the "this taxon is missing" finding was wrong for that name;
//   * an alias is appended to synonyms[] and changes no accepted name and creates no record.
// Runs before the curated overrides so a curated file can target an added record.
let backboneAdded = 0;
let aliasAppended = 0;
let backboneExpect = null;
const backbonePath = join(ROOT, 'data/backbone-refresh.json');
if (existsSync(backbonePath)) {
  const bb = JSON.parse(readFileSync(backbonePath, 'utf8'));
  const tag = bb.provenance_tag || 'backbone-refresh';
  backboneExpect = bb.build_expect || null;

  const acceptedNames = new Set(records.map((r) => r.accepted));
  const seenNew = new Set();
  const collisions = [];
  for (const rec of bb.records || []) {
    if (usedSlugs.has(rec.slug)) collisions.push(`existing slug: ${rec.slug}`);
    if (seenNew.has(rec.slug)) collisions.push(`duplicate within overlay: ${rec.slug}`);
    if (acceptedNames.has(rec.accepted)) collisions.push(`existing accepted name: ${rec.accepted}`);
    seenNew.add(rec.slug);
  }
  if (collisions.length) {
    console.error('! backbone overlay ABORT — collisions (a collision means the absence finding was wrong):');
    for (const c of collisions) console.error(`    ${c}`);
    process.exit(1);
  }

  for (const rec of bb.records || []) {
    const copy = structuredClone(rec);
    copy.synonyms = [...new Set(copy.synonyms || [])].sort();
    copy.sources = [...new Set([...(copy.sources || []), tag])].sort();
    records.push(copy);
    usedSlugs.set(copy.slug, true);
    bySlug.set(copy.slug, copy);
    backboneAdded++;
  }
  // keep the canonical accepted-name ordering the finalize step established
  records.sort((a, b) => a.accepted.localeCompare(b.accepted));

  for (const a of bb.alias_additions_no_new_record || []) {
    const target = bySlug.get(a.catalog_target_slug);
    if (!target) { console.warn(`! alias target missing: ${a.catalog_target_slug}`); continue; }
    if (a.queried_name === target.accepted) continue;         // a name is not its own synonym
    if (target.synonyms.includes(a.queried_name)) continue;   // already findable — no-op
    target.synonyms.push(a.queried_name);
    target.synonyms.sort();
    aliasAppended++;
  }
  console.log(`backbone overlay    : +${backboneAdded} records, +${aliasAppended} synonym aliases`);
}

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

// 4.5) Index Fungorum overlay — FILL-ONLY year/authorship (data/index-fungorum.json).
// See MYCOSCI-MERGE-PLAN.md §3. Three properties this code exists to guarantee:
//
//   1. FILL-ONLY. A value is written only into a field that is absent/null/blank. A non-empty
//      value is NEVER rewritten — not by IF, not even when IF is probably right. The 2,898
//      known conflicting values are counted and left alone.
//   2. GATES RUN BEFORE WRITES. A record that IF missed, that IF gives a different current
//      name for, or that IF matches with more than one exact record (a homonym) gets NOTHING,
//      even if the field it would fill is empty. Those 1,778 records are human decisions.
//      Ordering is the entire safety property: a homonym's year is exactly the field the
//      ambiguity attacks.
//   3. RUNS AFTER the curated overrides, so a hand-curated year/authorship is "non-empty" by
//      the time this sees it and is therefore untouchable under rule 1.
const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
let ifYearWrites = 0, ifAuthWrites = 0;
let ifGateMiss = 0, ifGateName = 0, ifGateHomonym = 0;
let ifYearConflicts = 0, ifAuthConflicts = 0;
let ifExpect = null;
const ifPath = join(ROOT, 'data/index-fungorum.json');
if (existsSync(ifPath)) {
  const ifFile = JSON.parse(readFileSync(ifPath, 'utf8'));
  const ifRecords = ifFile.records || {};
  ifExpect = ifFile.build_expect || null;

  // Pre-flight canary. An earlier build of this file took Index Fungorum's exact[0] instead of
  // ranking the candidate records, which dated Agaricus bisporus to Pilat 1951 instead of
  // (J.E. Lange) Imbach 1946. Refuse to run at all on a file that fails this.
  const canary = ifRecords['agaricus-bisporus'];
  if (!canary || canary.year !== 1946 || canary.authors !== '(J.E. Lange) Imbach') {
    console.error('! index-fungorum overlay ABORT — pre-flight canary failed.');
    console.error(`    agaricus-bisporus is ${JSON.stringify(canary?.authors)} ${JSON.stringify(canary?.year)}`);
    console.error('    expected "(J.E. Lange) Imbach" 1946 — this looks like the exact[0]-bugged file.');
    process.exit(1);
  }

  for (const [slug, e] of Object.entries(ifRecords)) {
    const rec = bySlug.get(slug);
    if (!rec) continue;
    if (e.if_status !== 'HIT') { ifGateMiss++; continue; }

    // count what we are declining to rewrite (rule 1), before the gates consume the record
    if (!isBlank(rec.year) && !isBlank(e.year) && rec.year !== e.year) ifYearConflicts++;
    if (!isBlank(rec.authorship) && !isBlank(e.authors) && rec.authorship !== e.authors) ifAuthConflicts++;

    if (e.name_disagreement) { ifGateName++; continue; }          // IF asserts another current name
    if ((e.if_n_exact_records || 0) > 1) { ifGateHomonym++; continue; } // homonym: our pick was a tiebreak

    if (isBlank(rec.year) && !isBlank(e.year)) { rec.year = e.year; ifYearWrites++; }
    if (isBlank(rec.authorship) && !isBlank(e.authors)) { rec.authorship = e.authors; ifAuthWrites++; }
  }
  console.log(`index-fungorum overlay: ${ifYearWrites} year + ${ifAuthWrites} authorship written (fill-only)`);
  // NB the gates are sequential, so these are disjoint buckets summing to the gated total.
  // The full homonym population is 1,258; 446 of those are also name disagreements and are
  // already counted in the previous bucket, which is why the homonym bucket reads 812.
  console.log(`  gated, untouched    : ${ifGateMiss} IF miss + ${ifGateName} name disagreement + ${ifGateHomonym} homonym = ${ifGateMiss + ifGateName + ifGateHomonym}`);
  console.log(`  conflicts left alone: ${ifYearConflicts} year, ${ifAuthConflicts} authorship`);
}

// Overlay contract check. Each overlay file states the counts it is expected to apply; a
// mismatch means the inputs, the gates or the upstream data moved, and that must be reviewed
// rather than absorbed silently. This is the guard against the failure mode where the overlay
// stops firing and the build still exits 0.
{
  const actual = {
    backbone_records_added: backboneAdded,
    backbone_aliases_appended: aliasAppended,
    if_year_writes: ifYearWrites,
    if_authorship_writes: ifAuthWrites,
    if_gated_if_miss: ifGateMiss,
    if_gated_name_disagreement: ifGateName,
    if_gated_homonym: ifGateHomonym,
    if_year_conflicts_left: ifYearConflicts,
    if_authorship_conflicts_left: ifAuthConflicts,
  };
  const expected = { ...(backboneExpect || {}), ...(ifExpect || {}) };
  const bad = Object.entries(expected).filter(([k, v]) => actual[k] !== v);
  if (bad.length) {
    console.error('! OVERLAY CONTRACT MISMATCH — the overlay did not apply what it promises.');
    for (const [k, v] of bad) console.error(`    ${k}: expected ${v}, got ${actual[k]}`);
    console.error('    Review why before updating build_expect in the overlay file.');
    process.exit(1);
  }
  if (Object.keys(expected).length) {
    console.log(`overlay contract    : ${Object.keys(expected).length} counts match`);
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
