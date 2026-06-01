#!/usr/bin/env node
// Emit the static JSON API from the canonical data object (data/species.json).
//
// Outputs (all under public/, copied verbatim into dist/ by Astro, gitignored):
//   public/species/{slug}.json            — one file per taxon (the per-species API)
//   public/api/species/index.json         — shard manifest + totals
//   public/api/species/{shard}.json        — full records for that shard (browse whole genera/families)
//   public/api/search-index.json          — slim index for client-side search
//
// GitHub Pages serves these as a free, keyless, rate-limit-free REST-ish API:
//   GET /species/amanita-muscaria.json
//   GET /api/species/index.json
//   GET /api/species/a.json

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');

const records = JSON.parse(readFileSync(join(ROOT, 'data/species.json'), 'utf8'));

// Clean + recreate output dirs so stale files never linger.
const dirs = {
  species: join(PUB, 'species'),
  api: join(PUB, 'api', 'species'),
};
for (const d of Object.values(dirs)) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const shardKey = (slug) => (/^[a-z]/.test(slug) ? slug[0] : '0');

const shards = new Map();
for (const rec of records) {
  const api = { ...rec, url: `/species/${rec.slug}` };
  // per-species file
  writeFileSync(join(dirs.species, `${rec.slug}.json`), JSON.stringify(api));
  // accumulate shard
  const k = shardKey(rec.slug);
  if (!shards.has(k)) shards.set(k, []);
  shards.get(k).push(api);
}

// shard files + manifest
const manifest = {
  generated: 'static',
  total: records.length,
  resolved: records.filter((r) => !r.unresolved).length,
  curated: records.filter((r) => r.tier === 'curated').length,
  endpoints: {
    species: '/species/{slug}.json',
    shard: '/api/species/{shard}.json',
    searchIndex: '/api/search-index.json',
  },
  shards: [],
};
for (const [k, list] of [...shards].sort(([a], [b]) => a.localeCompare(b))) {
  writeFileSync(join(dirs.api, `${k}.json`), JSON.stringify(list));
  manifest.shards.push({ shard: k, count: list.length, url: `/api/species/${k}.json` });
}
writeFileSync(join(dirs.api, 'index.json'), JSON.stringify(manifest, null, 2));

// slim client-side search index:
// [slug, accepted, commonName|0, family|0, curated(0/1), edibility(0-4), phylum|0]
const EDIB = { unknown: 0, edible: 1, inedible: 2, toxic: 3, psychoactive: 4 };
const searchIndex = records.map((r) => [
  r.slug,
  r.accepted,
  r.commonName || 0,
  r.family || 0,
  r.tier === 'curated' ? 1 : 0,
  EDIB[r.edibility] ?? 0,
  r.phylum || 0,
]);
writeFileSync(join(PUB, 'api', 'search-index.json'), JSON.stringify(searchIndex));

console.log('=== api emit complete ===');
console.log(`per-species files : ${records.length}  -> public/species/`);
console.log(`shards            : ${manifest.shards.length} -> public/api/species/`);
console.log(`search index      : ${(JSON.stringify(searchIndex).length / 1e6).toFixed(1)} MB`);
