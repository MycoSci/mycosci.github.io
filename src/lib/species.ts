// Phase-1 species record: the subset of the full data model (docs/SPECIES-DATA-MODEL.md)
// we render and enrich today. All enrichment fields are optional and omitted when empty;
// they land via curated overrides (data/curated/*.json) merged in scripts/build-data.mjs.

export type Edibility = 'edible' | 'inedible' | 'toxic' | 'deadly' | 'psychoactive' | 'unknown';
export type Preparation = 'none' | 'cook' | 'parboil' | 'dry' | 'special' | 'not-applicable';
export type TrophicMode =
  | 'ectomycorrhizal' | 'saprotroph' | 'parasite' | 'endophyte' | 'lichenized' | 'mycoparasite' | 'unknown';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'year-round';

export interface Vernacular { name: string; lang?: string; region?: string }
export interface Lookalike { slug?: string; name: string; note?: string }
export interface Reference { title: string; url?: string }
export interface Registry { mycoBank?: string; indexFungorum?: string; gbif?: string; ncbi?: string }

export interface SpeciesRecord {
  // identity (core)
  slug: string;
  accepted: string;
  genus: string;
  family: string;
  order: string;
  class: string;
  phylum: string;
  kingdom: string;
  commonName: string | null;
  edibility: Edibility;
  synonyms: string[];
  tier: 'curated' | 'stub';
  unresolved?: boolean;
  mdxPath?: string;
  sources: string[];

  // phase-1 enrichment (all optional)
  authorship?: string;
  year?: number;
  registry?: Registry;
  vernacularNames?: Vernacular[];
  description?: string;
  edibilityNotes?: string;
  preparation?: Preparation;
  notableCompounds?: string[];
  dangerousLookalikes?: Lookalike[];
  trophicMode?: TrophicMode;
  habitat?: string[];
  substrate?: string[];
  hosts?: string[];
  fruitingSeason?: Season[];
  distribution?: string;
  capColor?: string[];
  sporePrintColor?: string;
  references?: Reference[];
  lastReviewed?: string;
}

// --- presentation helpers (safety-first) ---

// Edibility that hasn't been established renders as "unknown — treat as inedible".
// Never present a blank/absent value as safe.
export const EDIBILITY_META: Record<Edibility, { label: string; badge: string; caution: boolean }> = {
  edible:       { label: 'Edible',                 badge: 'badge-mycel', caution: false },
  inedible:     { label: 'Inedible',               badge: 'badge',       caution: false },
  toxic:        { label: 'Toxic',                   badge: 'badge-spore', caution: true },
  deadly:       { label: 'Deadly',                  badge: 'badge-spore', caution: true },
  psychoactive: { label: 'Psychoactive',            badge: 'badge-spore', caution: true },
  unknown:      { label: 'Unknown — treat as inedible', badge: 'badge',  caution: true },
};

export function edibilityMeta(e: string | undefined) {
  return EDIBILITY_META[(e as Edibility)] ?? EDIBILITY_META.unknown;
}

export function cautionText(rec: SpeciesRecord): string {
  switch (rec.edibility) {
    case 'deadly':
      return 'This species is deadly poisonous. Do not handle-and-eat, do not taste-test. There is no safe culinary use.';
    case 'toxic':
      return 'This species is toxic. Do not consume.';
    case 'psychoactive':
      return 'This species is psychoactive and may be toxic. It is controlled in many jurisdictions. Informational only.';
    case 'unknown':
      return 'Edibility is not established. Treat as inedible. Never eat a wild fungus identified from this page alone.';
    case 'edible':
      return rec.preparation && rec.preparation !== 'none'
        ? 'Reported edible only when properly prepared. Misidentification can be fatal — confirm with an expert.'
        : 'Reported edible, but misidentification can be fatal. Never rely on a web page for a consumption decision.';
    default:
      return 'Never eat a wild fungus identified from a web page alone. Confirm with a qualified expert.';
  }
}

// External authority links (only rendered when an ID is present — never fabricated).
export function registryLinks(r: Registry | undefined) {
  if (!r) return [] as { label: string; url: string; id: string }[];
  const out: { label: string; url: string; id: string }[] = [];
  if (r.mycoBank) out.push({ label: 'MycoBank', id: r.mycoBank, url: `https://www.mycobank.org/page/Name%20details%20page/${r.mycoBank}` });
  if (r.indexFungorum) out.push({ label: 'Index Fungorum', id: r.indexFungorum, url: `https://www.indexfungorum.org/names/NamesRecord.asp?RecordID=${r.indexFungorum}` });
  if (r.gbif) out.push({ label: 'GBIF', id: r.gbif, url: `https://www.gbif.org/species/${r.gbif}` });
  if (r.ncbi) out.push({ label: 'NCBI', id: r.ncbi, url: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${r.ncbi}` });
  return out;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
