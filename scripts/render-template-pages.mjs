#!/usr/bin/env node
// Deterministic template pages for the long tail (tiers T3 / T4 / T5).
//
// WHY THIS EXISTS
// The coverage census measured that most of the catalog has no literature behind it. The
// narrative pilot then tested that finding directly: 4 of 5 spine-only species gained ZERO
// independent sources even after the source-acquisition pass doubled the evidence base
// corpus-wide, and the whole digitised-literature route produced one usable sentence for one
// species. A language model pointed at those species does not find facts; it produces prose
// shaped like facts. So these species do not go through a model at all. They get this: a
// short page assembled mechanically from the registry spine, which says what is recorded and
// then says, in plain words, that nothing else is known.
//
// PROPERTIES THIS FILE IS RESPONSIBLE FOR
//   * No generation. Every sentence is either a spine value or fixed template text. There is
//     no model, no network, and no inference from genus, family or name.
//   * Deterministic. Same inputs -> byte-identical output, including provenance. Nothing here
//     reads the clock; `generated` is derived from the inputs and each input is digested.
//   * occurrence_count is emitted ONLY when the GBIF spine says matchType EXACT and rank
//     SPECIES. 21 records in the shipped catalog carry a kingdom/phylum key in registry.gbif
//     (the HIGHERRANK bug); a count built from one of those is wrong by six orders of
//     magnitude, so registry.gbif is never used as an occurrence key here.
//   * edibility stays null, edibility_evidence stays "none", and the page states that nothing
//     is known rather than leaving a silence that reads as reassurance.
//
// Usage:  node scripts/render-template-pages.mjs [--out DIR] [--limit N] [--tiers T3,T4,T5]

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_VERSION = '1.2';
const SCHEMA_VERSION = '1.1';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const OUT = arg('--out', join(ROOT, 'template-pages'));
const LIMIT = +arg('--limit', 0) || Infinity;
const WANT_TIERS = new Set(arg('--tiers', 'T3,T4,T5').split(','));

// ------------------------------------------------------------------ inputs
function load(rel, required = true) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    if (required) { console.error(`! missing required input: ${rel}`); process.exit(1); }
    return { data: null, digest: null };
  }
  const raw = readFileSync(p);
  return { data: JSON.parse(raw), digest: createHash('sha256').update(raw).digest('hex').slice(0, 16) };
}

const SPECIES = load('data/species.json');
const IF = load('data/index-fungorum.json');
const BB = load('data/backbone-refresh.json');
const SPINE = load('data/gbif-spine.json');

const catalog = SPECIES.data;
const ifRecords = { ...(BB.data.if_enrichment || {}), ...(IF.data.records || {}) };
const gbifSpine = SPINE.data;

const INPUTS = {
  'data/species.json': SPECIES.digest,
  'data/index-fungorum.json': IF.digest,
  'data/backbone-refresh.json': BB.digest,
  'data/gbif-spine.json': SPINE.digest,
};
// Deterministic stand-in for a wall clock: the newest generation date the inputs declare.
const GENERATED = [IF.data.generated, BB.data.generated].filter(Boolean).sort().pop() || 'unknown';
// Each registry record carries the date ITS registry was read, not a single page-build date --
// a source's `fetched` is a claim about that fetch. Known approximation: the GBIF date is when
// data/gbif-spine.json was last written, so a record fetched early in a long harvest is dated a
// few hours late. It is never a clock read at render time, which is what keeps the output
// deterministic.
const IF_FETCHED = IF.data.generated || null;
const GBIF_FETCHED = (SPINE.data._meta && SPINE.data._meta.generated) || null;

// ------------------------------------------------------------------ tiering
// The cut points are the census's, and the reason they are where they are is a measured
// regime change: country-level distribution data appears at ~100 occurrences, English
// vernacular names at ~1,000. An English common name is the proxy for "somebody outside
// taxonomy has cared about this organism", which is the precondition for there being any
// history, folklore or cultivation practice to write about.
function classify(rec) {
  const g = gbifSpine[rec.slug];
  const e = ifRecords[rec.slug];
  const ifHit = !!(e && e.if_status === 'HIT');

  if (!g) return { tier: 'unassessed', why: 'no GBIF spine record was fetched for this slug' };
  if (g.match_type !== 'EXACT') {
    return ifHit
      ? { tier: 'T4', why: `GBIF has no exact match for this name (matchType ${g.match_type}); Index Fungorum does have a record` }
      : { tier: 'T5', why: `GBIF has no exact match for this name (matchType ${g.match_type}) and Index Fungorum has no exact record either` };
  }
  const occ = g.occurrence_count || 0;
  const vern = rec.vernacularNames || [];
  const enVern = vern.some((v) => (v.lang || '').toLowerCase().startsWith('en')) || !!rec.commonName;
  const anyVern = vern.length > 0 || !!rec.commonName;
  if (enVern && occ >= 1000) return { tier: 'T1', why: 'English vernacular name and >=1,000 occurrences' };
  const strong = [occ >= 1000, enVern, anyVern, (rec.synonyms || []).length >= 3,
                  (g.countries || []).length >= 3].filter(Boolean).length;
  if (occ >= 100 && strong >= 2) return { tier: 'T2', why: `>=100 occurrences and ${strong} narrative signals` };
  if (occ >= 1) return { tier: 'T3', why: `exact GBIF match but only ${occ} occurrence record(s) and thin narrative signal` };
  if (rec.year || (e && e.year)) return { tier: 'T3', why: 'exact GBIF match with no occurrence records; author and year are all that is recorded' };
  return { tier: 'T5', why: 'no occurrence records and no publication year in either registry' };
}

// ------------------------------------------------------------------ spine assembly
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const str = (v) => (blank(v) ? null : String(v).trim());

function buildSpine(rec, tier) {
  const g = gbifSpine[rec.slug] || {};
  const e = ifRecords[rec.slug] || {};

  // THE HIGHERRANK GUARD. Two independent conditions, both from the GBIF match response and
  // neither from registry.gbif, which is the field that carries the 21 bad keys.
  const exactSpecies = g.match_type === 'EXACT' && g.rank === 'SPECIES';
  const occurrence = exactSpecies && typeof g.occurrence_count === 'number' ? g.occurrence_count : null;
  const countries = exactSpecies ? (g.countries || []).filter((c) => c && c !== 'ZZ') : [];

  const ifCurrent = str(e.if_current_name);
  return {
    scientific_name: rec.accepted,
    genus: rec.genus || '',
    family: rec.family || '',
    order: rec.order || '',
    class: rec.class || '',
    phylum: rec.phylum || '',
    kingdom: rec.kingdom || '',
    authorship: str(rec.authorship),
    year: typeof rec.year === 'number' ? rec.year : null,
    year_source: typeof rec.year === 'number' ? (e.year === rec.year ? 'index_fungorum' : 'catalog') : null,
    basionym_record_id: str(e.basionym_record_id),
    protonym_record_id: str(e.protonym_record_id),
    published_in: str(e.published_in),
    name_status: str(e.name_status),
    type_locality: str(e.type_locality),
    host_substrate: str(e.host_substrate),
    synonyms: [...(rec.synonyms || [])],
    vernacular_names: (rec.vernacularNames || []).filter((v) => v && v.name)
      .map((v) => ({ name: v.name, lang: v.lang || 'und' })),
    gbif_usage_key: exactSpecies && g.usage_key ? String(g.usage_key) : null,
    gbif_match_type: str(g.match_type),
    occurrence_count: occurrence,
    countries,
    if_record_id: str(e.if_record_id),
    if_current_name: ifCurrent,
    name_disagreement: !!e.name_disagreement,
    tier,
  };
}

// ------------------------------------------------------------------ registry string hygiene
// Index Fungorum ships markup inside its data: 1,148 of its type-locality / host-substrate /
// published-in strings contain <i>...</i>, and 89 contain a pipe. The raw value is kept in the
// spine (zone 1 is copied, not edited), but anything that reaches prose or a markdown table is
// converted first: <i>/<em> become markdown emphasis, every other tag is dropped rather than
// passed through, and pipes are escaped so they cannot break a table.
function plain(v) {
  if (!v) return v;
  return String(v)
    .replace(/<\/?(?:i|em)\b[^>]*>/gi, '*')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const cell = (v) => plain(v).replace(/\|/g, '\\|');

// ------------------------------------------------------------------ prose (fixed text only)
const listify = (xs) => (xs.length === 0 ? '' : xs.length === 1 ? xs[0]
  : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);

function summary(sp) {
  // A mechanical restatement of spine values. It contains no adjective that is not a
  // registry field and makes no claim about the organism beyond where it sits and who named it.
  const parts = [];
  const rank = [];
  if (sp.family) rank.push(`the family ${sp.family}`);
  if (sp.order) rank.push(`the order ${sp.order}`);
  if (sp.class) rank.push(`the class ${sp.class}`);
  if (sp.phylum) rank.push(`the phylum ${sp.phylum}`);
  const named = sp.authorship ? `${sp.scientific_name} ${sp.authorship}` : sp.scientific_name;
  parts.push(rank.length
    ? `${named} is a fungus placed in ${listify(rank)}.`
    : `${named} is a fungus; the catalog records no family, order or class placement for it.`);

  if (sp.year && sp.published_in) parts.push(`The name was published in ${sp.published_in} (${sp.year}).`);
  else if (sp.year) parts.push(`The name dates from ${sp.year}.`);
  else parts.push('No publication year is recorded for the name in either registry consulted.');

  if (sp.type_locality) parts.push(`Index Fungorum records the type locality as ${plain(sp.type_locality)}.`);
  if (sp.host_substrate) parts.push(`Index Fungorum records the host or substrate as ${plain(sp.host_substrate)}.`);

  if (sp.synonyms.length === 1) parts.push(`One other name, ${sp.synonyms[0]}, is recorded for it.`);
  else if (sp.synonyms.length > 1) parts.push(`${sp.synonyms.length} other names are recorded for it.`);

  if (sp.occurrence_count === null) {
    parts.push('No occurrence records could be counted for it, so nothing is recorded here about where it grows.');
  } else if (sp.occurrence_count === 0) {
    parts.push('GBIF holds no occurrence records for it, so nothing is recorded here about where it grows.');
  } else {
    const c = sp.countries.length
      ? `, from ${sp.countries.length} ${sp.countries.length === 1 ? 'country' : 'countries'} (${sp.countries.slice(0, 8).join(', ')}${sp.countries.length > 8 ? ', …' : ''})`
      : ', with no country attached to them';
    parts.push(`GBIF holds ${sp.occurrence_count.toLocaleString('en-US')} occurrence record${sp.occurrence_count === 1 ? '' : 's'}${c}.`);
  }
  parts.push('No other field is recorded in this catalog for this species.');
  return parts.join(' ');
}

// The gaps list is assembled per record from what is actually absent, so it is a true
// statement about this species and not a boilerplate paragraph pasted onto every page.
function gaps(sp, tierWhy) {
  const g = [];
  const regs = [];
  if (sp.gbif_usage_key) regs.push('the GBIF backbone');
  if (sp.if_record_id) regs.push('Index Fungorum');
  g.push(regs.length
    ? 'This catalog holds no published source about this species. The page was assembled from '
      + `taxonomic registry records only (${listify(regs)}); `
      + `${regs.length > 1 ? 'neither is' : 'that is not'} a description of the organism.`
    : 'This catalog holds no published source about this species, and no registry record could '
      + 'be attached to it either. The page below is the catalog\'s own stored fields and '
      + 'nothing more.');
  if (!sp.type_locality) g.push('No type locality is recorded in Index Fungorum.');
  if (!sp.host_substrate) g.push('No host or substrate is recorded in Index Fungorum.');
  if (!sp.vernacular_names.length) g.push('No common name is recorded for it in any language.');
  if (sp.occurrence_count === null) {
    // gbif_usage_key is set only on an EXACT species-rank match, so its absence is exactly the
    // "we refused to use a higher-rank key" case, and its presence is "matched, no count came back".
    g.push(sp.gbif_usage_key
      ? 'GBIF matched this name exactly at species rank but returned no occurrence count for it, '
        + 'so no distribution is reported.'
      : `No occurrence count is shown: GBIF's match for this name came back as `
        + `${sp.gbif_match_type || 'no match at all'}, not an exact match at species rank. A count `
        + `taken from a higher-rank match would be a count of a whole genus, phylum or kingdom, `
        + `not of this species.`);
  } else if (sp.occurrence_count === 0) {
    g.push('GBIF holds no occurrence records, so there is no distribution to report.');
  } else if (!sp.countries.length) {
    g.push('The occurrence records carry no country, so there is no distribution to report.');
  }
  g.push(sp.host_substrate
    ? 'Beyond the host/substrate string above — a registry field, not an ecological account — no '
      + 'habitat, ecology, fruiting season, morphology or microscopy is recorded for it.'
    : 'No habitat, ecology, substrate, fruiting season, morphology or microscopy is recorded for it.');
  g.push('No cultural, culinary or historical account of this species is recorded.');
  g.push('No cultivation method is recorded for it.');
  g.push('The catalog holds no source that makes any statement about whether this species is '
       + 'edible or poisonous, and no look-alikes are documented for it.');
  if (sp.name_disagreement && sp.if_current_name) {
    g.push(`Index Fungorum treats ${plain(sp.if_current_name)} as the current name for this record, which `
         + `is not the name this catalog uses. The disagreement is unresolved and is shown rather `
         + `than silently picked.`);
  }
  if (sp.tier === 'T4') {
    g.push(`This record is a stale or unmatched name: ${tierWhy}. It needs a nomenclatural `
         + `correction before anything else about it can be looked up reliably.`);
  }
  if (sp.tier === 'T5') {
    g.push(`This record could not be verified in either registry: ${tierWhy}. It may be a `
         + `misspelling, an encoding error, or a name that no longer exists.`);
  }
  return g;
}

// ------------------------------------------------------------------ page
const REGISTRY_SOURCES = (sp) => {
  const out = [];
  if (sp.gbif_usage_key) {
    out.push({
      id: 'gbif_backbone', title: 'GBIF Backbone Taxonomy record', author: null,
      publisher: 'GBIF', date: null,
      url: `https://www.gbif.org/species/${sp.gbif_usage_key}`,
      domain: 'gbif.org', fetched: GBIF_FETCHED, kind: 'database',
      independence: { cluster_id: 0, derivative_of: null, derivative_evidence: null },
    });
  }
  if (sp.if_record_id) {
    out.push({
      id: 'index_fungorum', title: 'Index Fungorum nomenclatural record', author: null,
      publisher: 'Index Fungorum', date: null,
      url: `https://www.indexfungorum.org/names/NamesRecord.asp?RecordID=${sp.if_record_id}`,
      domain: 'indexfungorum.org', fetched: IF_FETCHED, kind: 'database',
      independence: { cluster_id: out.length, derivative_of: null, derivative_evidence: null },
    });
  }
  return out;
};

function sourceProvenance(sp, srcs) {
  // Honest by construction: the narrative source count is ZERO on every template page,
  // because no narrative source exists. The registry records are listed and named for what
  // they are -- nomenclature and occurrence indexes, not descriptions of the organism.
  const clusters = srcs.map((s, i) => ({
    cluster_id: i, representative: s.id, members: [s.id],
    publishers: [s.publisher], merged_on: [],
  }));
  const roots = srcs.map((s) => s.publisher);
  // What each registry actually is, stated separately: Index Fungorum records nomenclature
  // and records nothing about where a fungus grows, so a shared sentence about both would be
  // false on the Index-Fungorum-only pages.
  const what = {
    'GBIF': 'which indexes names and collection records',
    'Index Fungorum': 'which indexes the publication of names and nothing else',
  };
  let basis;
  if (roots.length === 0) {
    basis = 'No source is attached to this species, and no registry record could be matched '
          + 'to the name. Nothing on this page rests on published description.';
  } else if (roots.length === 1) {
    basis = `This catalog holds no published source describing this species. The page rests on one `
          + `taxonomic registry, ${roots[0]}, ${what[roots[0]] || 'a nomenclatural index'}. A registry `
          + `record establishes that the name has been published and used; it carries no description `
          + `of the organism. No statement on this page is corroborated by a second source.`;
  } else {
    basis = `This catalog holds no published source describing this species. The page rests on `
          + `${roots.length} taxonomic registries (${listify(roots)}), which index names and `
          + `collection records. A registry record establishes that the name has been published and `
          + `used; it carries no description of the organism. No statement on this page is `
          + `corroborated by a second source.`;
  }
  return {
    effective_independent_sources: 0,   // narrative sources; registries are not narrative
    n_sources_fetched: srcs.length,
    inflation_factor: 1.0,
    single_cluster: false,
    clusters,
    root_lineages: roots,
    registry_records: srcs.length,
    evidence_basis: basis,
  };
}

// The last clause of this warning is a statement about classify() in this file, not about
// today's catalog contents: classify() reads g.match_type, g.rank, g.occurrence_count,
// g.countries, rec.vernacularNames, rec.commonName, rec.synonyms and rec.year, and no
// edibility or toxicity field. That is what makes the clause true by construction rather
// than true-by-coincidence, and it stays true as the catalog grows. If classify() ever
// gains a toxicity input, this sentence must be revisited.
const READER_WARNING =
  'This catalog holds no source stating whether this species is edible or poisonous. '
  + 'Its edibility is unrecorded here because it is unknown to this catalog, not because it '
  + 'has been assessed and found unremarkable. The absence of a toxicity statement on this '
  + 'page is not evidence of safety, and nothing on this page supports a decision to eat this '
  + 'species. Which pages get this template is decided by classify() from registry coverage '
  + 'alone -- occurrence counts, recorded names and match type -- and it reads no toxicity '
  + 'field of any kind, so a seriously toxic species can and does sit at this evidence level.';

function buildPage(rec) {
  const { tier, why } = classify(rec);
  if (!WANT_TIERS.has(tier)) return null;
  const sp = buildSpine(rec, tier);
  const srcs = REGISTRY_SOURCES(sp);
  return {
    slug: rec.slug,
    schema_version: SCHEMA_VERSION,
    spine: sp,
    narrative: {
      summary: summary(sp),
      etymology: null,
      vernacular_name_origin: null,
      discovery_and_naming: null,
      cultural_and_culinary_history: null,
      cultivation: null,
      habitat: null,
      citations: {},
    },
    safety: {
      edibility_evidence: 'none',
      edibility: null,
      edibility_notes: null,
      toxicity: null,
      look_alikes: [],
      citations: {},
      // No toxicity verdict exists for a page with edibility_evidence 'none'; the danger
      // marker follows the verdict, so it is null here by construction, never by oversight.
      danger: null,
      reader_warning: READER_WARNING,
    },
    sources: srcs,
    independence: {
      compilations: {}, n_sources: srcs.length, effective_independent_sources: 0,
      inflation_factor: 1.0,
      clusters: srcs.map((s, i) => ({ cluster_id: i, members: [s.id], representative: s.id, reasons: [] })),
      pair_stats: [], minhash_error: null,
    },
    source_provenance: sourceProvenance(sp, srcs),
    gaps: gaps(sp, why),
    provenance: {
      generated: GENERATED,
      model: 'none — deterministic template, no language model was run',
      prompt_version: 'n/a',
      pipeline_version: `template-${TEMPLATE_VERSION}`,
      wall_clock_seconds: null,
      template: { version: TEMPLATE_VERSION, tier, tier_reason: why, inputs: INPUTS },
      validation: { errors: [], ok: true },
    },
  };
}

// ------------------------------------------------------------------ markdown
function md(page) {
  const sp = page.spine, s = page.safety, pv = page.source_provenance;
  const L = [];
  const A = (x = '') => L.push(x);
  A(`# *${sp.scientific_name}*${sp.authorship ? ' ' + sp.authorship : ''}`);
  A();
  const vn = sp.vernacular_names.slice(0, 6).map((v) => v.name).join(', ');
  A(`**${vn || 'no common name recorded'}** · `
    + (sp.occurrence_count === null
      ? 'occurrence count unavailable'
      : `${sp.occurrence_count.toLocaleString('en-US')} occurrence${sp.occurrence_count === 1 ? '' : 's'} worldwide (GBIF)`));
  A();
  A(page.sources.length
    ? '> **Scope.** This catalog holds no published source describing this species. The fields '
      + 'below are taxonomic registry values. The section "Not recorded" lists the fields that are '
      + 'absent.'
    : '> **Scope.** This catalog holds no published source describing this species, and no registry '
      + 'record could be matched to the name. The fields below are this catalog\'s own stored '
      + 'values. The section "Not recorded" lists the fields that are absent.');
  A();
  A(`> **Evidence basis.** ${pv.evidence_basis}`);
  A();
  A(`> ${s.reader_warning}`);
  A();
  if (sp.name_disagreement && sp.if_current_name) {
    A(`> **Unsettled name.** Index Fungorum gives the current name for this record as `
      + `*${plain(sp.if_current_name)}*. This catalog uses *${sp.scientific_name}*. The two registries `
      + `disagree and this catalog does not resolve the disagreement.`);
    A();
  }
  A('## Taxonomy');
  A();
  A('| field | value | source |');
  A('|---|---|---|');
  for (const k of ['kingdom', 'phylum', 'class', 'order', 'family', 'genus']) {
    A(`| ${k} | ${sp[k] || '—'} | catalog/GBIF |`);
  }
  A(`| authorship | ${sp.authorship || '—'} | ${sp.authorship ? (sp.year_source || 'catalog') : '—'} |`);
  A(`| year | ${sp.year || '—'} | ${sp.year ? (sp.year_source || 'catalog') : '—'} |`);
  A(`| published in | ${sp.published_in ? cell(sp.published_in) : '— not recorded'} | Index Fungorum |`);
  A(`| name status | ${sp.name_status ? cell(sp.name_status) : '— not recorded'} | Index Fungorum |`);
  A(`| basionym record | ${sp.basionym_record_id || '— not recorded'} | Index Fungorum |`);
  A(`| type locality | ${sp.type_locality ? cell(sp.type_locality) : '— not recorded'} | Index Fungorum |`);
  A(`| host / substrate | ${sp.host_substrate ? cell(sp.host_substrate) : '— not recorded'} | Index Fungorum |`);
  A(`| synonyms | ${sp.synonyms.length ? `${sp.synonyms.length} recorded` : 'none recorded'} | catalog |`);
  A(`| GBIF match | ${sp.gbif_match_type || '— no match'}${sp.gbif_usage_key ? ` (usage key ${sp.gbif_usage_key})` : ''} | GBIF |`);
  A(`| countries with records | ${sp.countries.length ? sp.countries.slice(0, 20).join(', ') + (sp.countries.length > 20 ? ', …' : '') : '— none'} | GBIF |`);
  A();
  if (sp.synonyms.length) {
    A('## Other names');
    A();
    for (const n of sp.synonyms) A(`- *${n}*`);
    A();
  }
  A('## Summary');
  A();
  A(page.narrative.summary);
  A();
  A('## Edibility');
  A();
  A('Evidence gate: `none`. The gate is set from the attached source count. No model was asked '
    + 'for a judgement.');
  A();
  A(s.reader_warning);
  A();
  A('This catalog publishes an edibility statement only where two independent sources agree, or '
    + 'where one authoritative source states it. No such source is attached to this species. This '
    + 'page contains no identification, preparation or foraging guidance.');
  A();
  A('## Not recorded');
  A();
  for (const g of page.gaps) A(`- ${g}`);
  A();
  A('## Sources');
  A();
  A(`Independent sources describing this species: ${pv.effective_independent_sources}. `
    + `Registry records listed below: ${pv.registry_records}.`);
  A();
  for (const src of page.sources) A(`- \`${src.id}\` — ${src.publisher} — ${src.url}`);
  if (!page.sources.length) A('- *(none)*');
  A();
  A('---');
  A();
  A(`*Assembled ${page.provenance.generated} by ${page.provenance.pipeline_version}. `
    + `Deterministic template; no language model was run for this page.*`);
  return L.join('\n') + '\n';
}

// ------------------------------------------------------------------ run
const counts = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, unassessed: 0 };
const rendered = [];
for (const rec of catalog) {
  const { tier } = classify(rec);
  counts[tier]++;
  if (!WANT_TIERS.has(tier)) continue;
  if (rendered.length >= LIMIT) continue;
  rendered.push(buildPage(rec));
}

// Guard: --out is wiped before writing, so refuse any directory that is not either empty or
// a previous run of this renderer.
if (existsSync(OUT)) {
  const existing = readdirSync(OUT);
  const mine = existing.length === 0
    || existsSync(join(OUT, '_index.json'))
    || existing.every((f) => f.endsWith('.json') || f.endsWith('.md'));
  if (!mine) {
    console.error(`! refusing to wipe ${OUT}: it is not empty and does not look like a previous render.`);
    process.exit(1);
  }
  rmSync(OUT, { recursive: true });
}
mkdirSync(OUT, { recursive: true });
let occWithCount = 0, occNull = 0;
for (const page of rendered) {
  writeFileSync(join(OUT, `${page.slug}.json`), JSON.stringify(page, null, 1) + '\n');
  writeFileSync(join(OUT, `${page.slug}.md`), md(page));
  if (page.spine.occurrence_count === null) occNull++; else occWithCount++;
}
writeFileSync(join(OUT, '_index.json'), JSON.stringify({
  template_version: TEMPLATE_VERSION, generated: GENERATED, inputs: INPUTS,
  tier_counts: counts, rendered: rendered.length,
  slugs: rendered.map((p) => p.slug),
}, null, 1) + '\n');

console.log('=== template pages ===');
console.log(`catalog records      : ${catalog.length}`);
for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'unassessed']) console.log(`  ${t.padEnd(18)} : ${counts[t]}`);
console.log(`rendered (${[...WANT_TIERS].join('/')})   : ${rendered.length}`);
console.log(`  with occurrence count : ${occWithCount}`);
console.log(`  occurrence suppressed : ${occNull}  (no EXACT species-rank GBIF match)`);
console.log(`-> ${OUT}`);
