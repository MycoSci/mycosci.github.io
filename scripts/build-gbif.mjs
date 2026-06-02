#!/usr/bin/env node
// Enrich the catalog from the GBIF Backbone (the same source the data was built from).
// For each resolved taxon: fetch authorship, year, GBIF usageKey, and English vernacular
// names. Writes an overlay map (slug -> fields) to data/gbif.json, which build-data.mjs
// merges in as a low-priority source (curated overrides always win).
//
// Resumable: re-running skips already-fetched slugs. Polite: small concurrency.
//   LIMIT=50 node scripts/build-gbif.mjs     # test on 50
//   node scripts/build-gbif.mjs              # full run (resumes)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data/gbif.json');
const SP = JSON.parse(readFileSync(join(ROOT, 'data/species.json'), 'utf8'));
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const LIMIT = process.env.LIMIT ? +process.env.LIMIT : Infinity;
const CONC = 8;

const targets = SP.filter((r) => !r.unresolved && !(r.slug in done)).slice(0, LIMIT);
console.log(`GBIF enrich: ${targets.length} taxa to fetch (${Object.keys(done).length} already cached)`);

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'MycoSci/0.1 (open fungal catalog)' } });
  if (!res.ok) throw new Error('http ' + res.status);
  return res.json();
};

async function fetchOne(rec) {
  try {
    const m = await get(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(rec.accepted)}&kingdom=Fungi&strict=true`);
    const out = {};
    if (m && m.usageKey && (m.matchType === 'EXACT' || (m.confidence ?? 0) >= 92)) {
      out.gbifKey = m.usageKey;
      if (m.scientificName && m.canonicalName && m.scientificName.startsWith(m.canonicalName)) {
        const auth = m.scientificName.slice(m.canonicalName.length).trim();
        if (auth) out.authorship = auth;
        const ym = auth.match(/\b(1[6-9]\d\d|20\d\d)\b/);
        if (ym) out.year = +ym[1];
      }
      if (!rec.commonName) {
        try {
          const v = await get(`https://api.gbif.org/v1/species/${m.usageKey}/vernacularNames?limit=100`);
          const en = [...new Set((v.results || []).filter((x) => x.language === 'eng' && x.vernacularName)
            .map((x) => x.vernacularName.trim()))].filter((n) => n.length < 40).slice(0, 3);
          if (en.length) out.vernacular = en;
        } catch { /* vernacular is optional */ }
      }
    }
    done[rec.slug] = out;
  } catch {
    done[rec.slug] = { error: true };
  }
}

let processed = 0;
const queue = [...targets];
async function worker() {
  while (queue.length) {
    await fetchOne(queue.shift());
    if (++processed % 250 === 0) {
      writeFileSync(OUT, JSON.stringify(done));
      console.log(`  ${processed}/${targets.length}`);
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
writeFileSync(OUT, JSON.stringify(done));

const hits = Object.values(done).filter((x) => x.gbifKey).length;
const withAuth = Object.values(done).filter((x) => x.authorship).length;
const withVern = Object.values(done).filter((x) => x.vernacular?.length).length;
console.log(`=== gbif enrich complete ===`);
console.log(`cached total : ${Object.keys(done).length}`);
console.log(`gbif matches : ${hits} | with authorship : ${withAuth} | with vernacular : ${withVern}`);
