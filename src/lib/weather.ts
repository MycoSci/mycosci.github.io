/**
 * weather.ts — the MycoMap section's data layer.
 *
 * Everything on /weather traces back through this file to a field in a run
 * record under data/weather/, which is a pipeline manifest verbatim plus what
 * scripts/publish-weather.mjs did to it. Nothing here recomputes a score,
 * derives a threshold, or fills a gap the data left.
 *
 * Four rules are load-bearing and were expensive to learn:
 *
 *   1. as_of_date is the freshness claim, never target_date. A morning run
 *      lands 14–38 hours behind real time and the page must say so.
 *   2. A run with publishable=false is not published. The publish script
 *      refuses it; nothing downstream may paper over that.
 *   3. Bands are enrichment — a likelihood ratio against effort-matched
 *      controls — never a probability. No percentage describes a chance of
 *      finding a mushroom anywhere on this site, at any sample size.
 *   4. Nothing in the score ramp is ever green. The OpenStreetMap base map
 *      draws forest in green and readers were reading forest as signal.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Where the map images are served from.
 *
 * One value, in one place, because the hostname is not settled and the network
 * it lives on is half-migrated. Set PUBLIC_MAPS_BASE_URL in .env (and give the
 * publish script the same value) to move every image on the site at once.
 *
 * A wrong or unreachable base URL must fail visibly rather than leaving a page
 * of broken images under a confident freshness banner — see Plate.astro, which
 * replaces a failed image with a statement of what is missing, and
 * imageState() below, which reports what the publish script could confirm.
 */
export const MAPS_BASE_URL = (
  (import.meta.env.PUBLIC_MAPS_BASE_URL as string | undefined) || 'https://maps.mycosci.com'
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// The score ramp, transcribed from cmd/render/main.go
//
// Reproduced here so the legend on the page is the same object as the legend
// baked into the PNG rather than an artist's impression of it. The publish
// script re-checks these stops against the renderer's source on every run and
// records a warning if they have drifted apart.
// ---------------------------------------------------------------------------

const RAMP_STOPS: Array<[number, number, number, number]> = [
  [0.0, 180, 140, 220], // pale lavender
  [0.25, 120, 60, 200], // blue-purple
  [0.5, 220, 40, 140], // hot magenta
  [0.75, 255, 120, 20], // fire orange
  [1.0, 255, 240, 40], // bright yellow
];

/** Score values the renderer labels under its ramp (cmd/render legendTicks). */
export const LEGEND_TICKS = [0.05, 0.25, 0.5, 0.75, 1.0];

/** The score below which the renderer leaves the base map alone. */
export const PAINT_FLOOR = 0.05;

/** Colour at DISPLAY position t in 0..1. Mirrors heatColor(). */
export function heatColor(t: number): string {
  const c = Math.min(Math.max(t, 0), 1);
  for (let i = 0; i < RAMP_STOPS.length - 1; i++) {
    const [t0, r0, g0, b0] = RAMP_STOPS[i];
    const [t1, r1, g1, b1] = RAMP_STOPS[i + 1];
    if (c <= t1 || i === RAMP_STOPS.length - 2) {
      const k = t1 === t0 ? 0 : Math.min(Math.max((c - t0) / (t1 - t0), 0), 1);
      const to = (a: number, b: number) => Math.round(a + k * (b - a));
      return `rgb(${to(r0, r1)}, ${to(g0, g1)}, ${to(b0, b1)})`;
    }
  }
  const [, r, g, b] = RAMP_STOPS[RAMP_STOPS.length - 1];
  return `rgb(${r}, ${g}, ${b})`;
}

/** SCORE -> ramp position. Mirrors displayScale(): sqrt, presentation only. */
export const displayScale = (score: number): number =>
  score <= 0 ? 0 : score >= 1 ? 1 : Math.sqrt(score);

/**
 * A CSS gradient in DISPLAY space, matching the bar drawn on the PNG.
 *
 * The renderer's legend bar is linear in display position with score ticks
 * placed at sqrt(score). Reproducing that exactly is the point: a legend the
 * reader can hold up against the image and check.
 */
export function rampGradientCss(steps = 40): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    parts.push(`${heatColor(t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface ManifestSpecies {
  id: string;
  common_name?: string;
  scientific_name?: string;
  model?: string;
  pixels_assessed?: number;
  pixels_painted?: number;
  pixels_unassessed?: number;
  painted_p50?: number;
  painted_p95?: number;
  max_score?: number;
  file?: string;
  sha256?: string;
}

export interface Manifest {
  manifest_version?: number;
  generated_at?: string;
  target_date?: string;
  as_of_date?: string;
  lag_days_behind_target?: number;
  weather?: any;
  terrain?: any;
  model_variant?: any;
  code?: { revision?: string; dirty?: boolean; renderer?: string; go_version?: string };
  score_bands?: any;
  species?: ManifestSpecies[];
  warnings?: string[];
  publishable?: boolean;
}

export interface RunImage {
  id: string;
  file?: string;
  url_path?: string;
  width?: number;
  height?: number;
  source_bytes?: number;
  published_bytes?: number;
  palette_colours?: number;
  render_sha256?: string;
  published_sha256?: string;
  /** true / false / null = never checked (the publish script did not upload) */
  origin_verified?: boolean | null;
}

export interface RunRecord {
  record_version: number;
  published_at: string;
  as_of_date: string;
  target_date?: string;
  lag_days_behind_target: number;
  manifest_sha256: string;
  manifest_path?: string;
  manifest: Manifest;
  images: RunImage[];
  origin_uploaded?: boolean;
  publish_notes?: string[];
}

export interface SpeciesProfile {
  id: string;
  common_name?: string;
  scientific_name?: string;
  substrate?: string;
  association?: string[];
  fruiting_conditions?: Record<string, any>;
  calibration?: Record<string, any>;
  season?: { primary?: string[]; extended?: string[]; months?: number[]; notes?: string };
  look_alikes?: string[];
  edibility?: string;
  special_notes?: string;
  taxonomy?: Record<string, any>;
}

export interface BandEntry {
  name: string;
  min: number;
  enrichment: number;
  meaning?: string;
}

export interface ValidationEntry {
  species: string;
  derived_from?: string;
  n_obs?: number;
  n_control?: number;
  max_observed_score?: number;
  paint_floor?: number;
  bands?: BandEntry[] | null;
  measured?: boolean;
  publish_as_foraging_map?: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

import latestPointer from '../../data/weather/latest.json';
import profilesFile from '../../data/weather/profiles.json';
import validationFile from '../../data/weather/validation.json';

const runModules = import.meta.glob<RunRecord>('../../data/weather/runs/*.json', {
  eager: true,
  import: 'default',
});

/** Every published run, oldest first. Only runs the publish script accepted exist here. */
export const runs: RunRecord[] = Object.values(runModules).sort((a, b) =>
  a.as_of_date.localeCompare(b.as_of_date)
);

export const latest = latestPointer as {
  as_of_date: string;
  target_date?: string;
  lag_days_behind_target: number;
  published_at: string;
  manifest_sha256: string;
  origin_uploaded?: boolean;
  publishable: boolean;
};

export const currentRun: RunRecord | undefined = runs.find(
  (r) => r.as_of_date === latest.as_of_date
);

export const profiles: Record<string, SpeciesProfile> =
  (profilesFile as any)?.profiles ?? {};

const validationRecord = (validationFile as any)?.record ?? null;

export const validationCaveat: string = validationRecord?.caveat ?? '';
export const validationGenerated: string = validationRecord?.generated ?? '';
export const validationMethod: string = validationRecord?.method ?? '';

const validationBySpecies: Record<string, ValidationEntry> = Object.fromEntries(
  (validationRecord?.species ?? []).map((s: ValidationEntry) => [s.species, s])
);

// ---------------------------------------------------------------------------
// Evidential status
// ---------------------------------------------------------------------------

export type StatusKind = 'measured' | 'unmeasured' | 'excluded';

export interface EvidentialStatus {
  kind: StatusKind;
  label: string;
  short: string;
  detail: string;
  entry?: ValidationEntry;
  topBand?: BandEntry;
}

/**
 * How much is actually known about this species' map.
 *
 * Three states, and the difference between the last two matters:
 *   measured   — a band analysis resolved against effort-matched controls.
 *   unmeasured — the analysis could not resolve, usually for want of records.
 *                NOT a finding that the model failed there.
 *   excluded   — held out of validation for a known, stated reason.
 */
export function evidentialStatus(id: string): EvidentialStatus {
  const profile = profiles[id];
  const tax = profile?.taxonomy ?? {};
  if (tax.validation_excluded) {
    return {
      kind: 'excluded',
      label: 'Excluded from validation',
      short: '',
      detail: tax.validation_note ?? '',
    };
  }

  const entry = validationBySpecies[id];
  if (!entry) {
    return {
      kind: 'unmeasured',
      label: 'Not measured',
      short: '',
      detail:
        'This species has no entry in the standing band analysis, so nothing is known ' +
        'about how its scores line up against real records. That is a missing ' +
        'measurement, not a failed one.',
    };
  }

  if (entry.measured) {
    const bands = entry.bands ?? [];
    const top = bands.reduce<BandEntry | undefined>(
      (best, b) => (b.enrichment && (!best || b.enrichment > best.enrichment) ? b : best),
      undefined
    );
    return {
      kind: 'measured',
      label: 'Measured',
      short: top ? `${top.enrichment.toFixed(1)}× at score ${top.min.toFixed(2)}+` : 'Measured',
      detail: entry.note ?? '',
      entry,
      topBand: top,
    };
  }

  return { kind: 'unmeasured', label: 'Not measured', short: '', detail: entry.note ?? '', entry };
}

/** The standing record's own refusal to publish a species as a foraging map. */
export function withheldAsForagingMap(id: string): ValidationEntry | null {
  const entry = validationBySpecies[id];
  if (!entry || entry.publish_as_foraging_map) return null;
  return entry;
}

/**
 * Bands this run carried for this species, or null.
 *
 * Must come from the manifest's own score_bands, never from the standing
 * validation record. The manifest describes what a particular run was rendered
 * with; anything else is a different measurement pasted onto a picture it does
 * not describe.
 */
export function manifestBands(manifest: Manifest, id: string): BandEntry[] | null {
  const raw = manifest?.score_bands;
  if (!raw || typeof raw !== 'object') return null;
  for (const entry of raw.species ?? []) {
    if (entry.species !== id) continue;
    if (!entry.measured || !entry.publish_as_foraging_map) return null;
    return Array.isArray(entry.bands) && entry.bands.length ? entry.bands : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export interface ImageState {
  url: string | null;
  image?: RunImage;
  /** 'ok' | 'unverified' | 'missing' — what the publish script could confirm. */
  state: 'ok' | 'unverified' | 'missing';
  note: string;
}

/**
 * What we can honestly say about a species' image on the origin.
 *
 * Since the images left the repository, the page and the picture can fall out
 * of sync. The URL is content-addressed by run date and image digest, so a
 * stale origin can only 404 — it can never serve yesterday's map under today's
 * date. This reports which of those we are in.
 */
export function imageState(run: RunRecord, id: string): ImageState {
  const image = run.images?.find((i) => i.id === id);
  if (!image?.url_path) {
    return {
      url: null,
      state: 'missing',
      note:
        'The publish step did not produce an image for this species — either the render ' +
        'was missing on disk or it did not match the digest its manifest claims.',
    };
  }
  const url = `${MAPS_BASE_URL}/${image.url_path}`;
  if (image.origin_verified === true) return { url, image, state: 'ok', note: '' };
  if (image.origin_verified === false) {
    return {
      url,
      image,
      state: 'missing',
      note: 'The map origin did not have this image when the run was published.',
    };
  }
  return {
    url,
    image,
    state: 'unverified',
    note:
      'This image was converted but its arrival on the map origin was never confirmed, ' +
      'so it may not load.',
  };
}

// ---------------------------------------------------------------------------
// The daily report
// ---------------------------------------------------------------------------

export interface SpeciesMovement {
  id: string;
  commonName: string;
  scientificName: string;
  paintedShare: number;
  paintedSharePrev?: number;
  paintedShareDelta?: number;
  maxScore: number;
  maxScorePrev?: number;
  p95: number;
  p95Prev?: number;
  prevAsOf?: string;
  gapDays?: number;
  sentence: string;
}

export interface WeatherReport {
  asOf: string;
  targetDate?: string;
  lagDays: number;
  /** The lede: what this run is, dated by the weather, not by the label. */
  lede: string;
  /** Whether anything earlier exists to compare against. */
  comparison:
    | { kind: 'none'; sentence: string }
    | { kind: 'previous'; prevAsOf: string; gapDays: number; sentence: string };
  movements: SpeciesMovement[];
  /** Facts about the weather fetch itself — provenance, not weather values. */
  weatherLayer: string[];
  /** Stated limits of this report, derived from what the manifest omits. */
  cannotSay: string;
  unassessedSentence: string;
  warnings: string[];
  publishNotes: string[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const sc = (n: number) => n.toFixed(2);

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

/** "35 days" when the bounds coincide, "30–35 days" when they do not. */
export function fmtRange(lo: unknown, hi: unknown, unit = ''): string {
  const suffix = unit ? ` ${unit}` : '';
  if (lo == null && hi == null) return '—';
  if (lo == null || hi == null) return `${lo ?? hi}${suffix}`;
  return lo === hi ? `${lo}${suffix}` : `${lo}\u2013${hi}${suffix}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return 'unknown';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtDateShort(iso?: string): string {
  if (!iso) return 'unknown';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Build the day's report from the run record and the run history.
 *
 * Every sentence below is assembled from numbers in a manifest. What the
 * manifests do NOT carry — rainfall totals, soil-moisture readings, any
 * regional breakdown — is stated as absent rather than imagined, which is what
 * `cannotSay` is for. A report that says "the coast took 24 mm" from a
 * manifest that records no precipitation at all is fiction, however plausible
 * it reads.
 */
export function buildReport(run: RunRecord): WeatherReport {
  const m = run.manifest;
  const speciesRows = m.species ?? [];
  const lag = run.lag_days_behind_target ?? 0;

  let lede =
    `Where mushrooms were likely fruiting in Oregon on ${fmtDate(run.as_of_date)}, ` +
    'worked out from the weather up to that day. ';
  lede += lag
    ? `The map is labelled ${run.target_date} but the weather behind it stops at ` +
      `${run.as_of_date}: the archive this reads runs about a day behind real time, and ` +
      'no part of this map knows what happened since.'
    : 'The weather archive had caught up to the map’s own date.';

  // The previous run that actually exists. Never an interpolated yesterday.
  const earlier = runs.filter((r) => r.as_of_date < run.as_of_date);
  const prev = earlier.length ? earlier[earlier.length - 1] : undefined;

  let comparison: WeatherReport['comparison'];
  if (!prev) {
    comparison = {
      kind: 'none',
      sentence:
        'This is the only run on record, so there is nothing to compare it against. ' +
        'Movement appears here once a second run exists.',
    };
  } else {
    const gap = daysBetween(prev.as_of_date, run.as_of_date);
    comparison = {
      kind: 'previous',
      prevAsOf: prev.as_of_date,
      gapDays: gap,
      sentence:
        gap === 1
          ? `The previous run on record is ${fmtDateShort(prev.as_of_date)}, one day earlier, ` +
            'so the movement below is overnight.'
          : `The previous run on record is ${fmtDateShort(prev.as_of_date)} — ${gap} days ` +
            'earlier. Nothing was published in between, so the movement below is the ' +
            `difference between two runs ${gap} days apart, not a daily trend. No value is ` +
            'invented for the days the pipeline did not produce.',
    };
  }

  const movements: SpeciesMovement[] = speciesRows.map((sp) => {
    const assessed = sp.pixels_assessed || 1;
    const share = (sp.pixels_painted ?? 0) / assessed;
    const profile = profiles[sp.id];
    const commonName = sp.common_name ?? profile?.common_name ?? sp.id;
    const scientificName = sp.scientific_name ?? profile?.scientific_name ?? '';

    const prevSp = prev?.manifest.species?.find((s) => s.id === sp.id);
    if (!prevSp || !prev) {
      return {
        id: sp.id,
        commonName,
        scientificName,
        paintedShare: share,
        maxScore: sp.max_score ?? 0,
        p95: sp.painted_p95 ?? 0,
        sentence:
          `${commonName} painted ${pct(share)} of assessed ground, topping out at ` +
          `${sc(sp.max_score ?? 0)}. No earlier run on record carries this species, so ` +
          'there is nothing to compare it against.',
      };
    }

    const prevShare = (prevSp.pixels_painted ?? 0) / (prevSp.pixels_assessed || 1);
    const gap = daysBetween(prev.as_of_date, run.as_of_date);
    const delta = share - prevShare;
    const dir = Math.abs(delta) < 0.0005 ? 'held at' : delta > 0 ? 'rose to' : 'fell to';
    const maxPrev = prevSp.max_score ?? 0;
    const maxNow = sp.max_score ?? 0;
    const maxDir =
      Math.abs(maxNow - maxPrev) < 0.005 ? 'held at' : maxNow > maxPrev ? 'rose to' : 'fell to';

    return {
      id: sp.id,
      commonName,
      scientificName,
      paintedShare: share,
      paintedSharePrev: prevShare,
      paintedShareDelta: delta,
      maxScore: maxNow,
      maxScorePrev: maxPrev,
      p95: sp.painted_p95 ?? 0,
      p95Prev: prevSp.painted_p95 ?? 0,
      prevAsOf: prev.as_of_date,
      gapDays: gap,
      sentence:
        `${commonName}’s painted area ${dir} ${pct(share)} of assessed ground from ` +
        `${pct(prevShare)}, and the highest score anywhere in Oregon ${maxDir} ` +
        `${sc(maxNow)} from ${sc(maxPrev)}. That is measured against the run of ` +
        `${fmtDateShort(prev.as_of_date)}, ${gap} day${gap === 1 ? '' : 's'} earlier.`,
    };
  });

  // Biggest mover first, so the report leads with what actually changed.
  movements.sort(
    (a, b) => Math.abs(b.paintedShareDelta ?? 0) - Math.abs(a.paintedShareDelta ?? 0)
  );

  // Provenance of the weather fetch. These are facts about the request, not
  // about the weather: the manifest records how the data was obtained and how
  // complete it was, and records no weather values at all.
  const w = m.weather ?? {};
  const fresh = w.freshness ?? {};
  const weatherLayer: string[] = [];
  if (w.source) {
    weatherLayer.push(
      `Read from ${w.source} using the ${w.model} model, ${w.grid_points ?? '—'} grid ` +
        `points at ${w.step_degrees ?? '—'}° spacing, each carrying ` +
        `${fmtRange(fresh.min_days, fresh.max_days, 'days')} of hourly history.`
    );
  }
  if (w.model_verification?.agrees === true) {
    weatherLayer.push(
      `Before rendering, the run re-fetched ${w.model_verification.hours_compared} hours the ` +
        'model had already served and confirmed they came back identical, so the endpoint ' +
        'is still serving the model this map claims.'
    );
  } else if (w.model_verification) {
    weatherLayer.push(
      'The run’s model-verification check did not agree; the endpoint may no longer be ' +
        'serving the model this map claims.'
    );
  }
  if (typeof fresh.points_with_soil_moisture_on_last_day === 'number' && fresh.points) {
    const missing = fresh.points - fresh.points_with_soil_moisture_on_last_day;
    if (missing > 0) {
      weatherLayer.push(
        `${missing} of ${fresh.points} grid points had no soil-moisture reading on their ` +
          'last day, and fall back to the precipitation proxy there.'
      );
    }
  }
  weatherLayer.push(
    `${w.allow_forecast_hours ?? 0} forecast hours were scored: this run is ` +
      (w.allow_forecast_hours ? 'part forecast.' : 'entirely observed weather, no forecast.')
  );
  if (fresh.last_observed_hour) {
    weatherLayer.push(
      `The last hour of weather any grid point knew about is ` +
        `${String(fresh.last_observed_hour).replace('T', ' ')}.`
    );
  }

  const unassessed = speciesRows.reduce((n, s) => n + (s.pixels_unassessed ?? 0), 0);
  const assessed = speciesRows.reduce((n, s) => n + (s.pixels_assessed ?? 0), 0);
  const total = assessed + unassessed;
  const shareUn = total ? unassessed / total : 0;
  const unassessedSentence = total
    ? shareUn > 0
      ? `About one pixel in ${Math.round(1 / shareUn)}`
      : 'None'
    : 'An unknown share';

  return {
    asOf: run.as_of_date,
    targetDate: run.target_date,
    lagDays: lag,
    lede,
    comparison,
    movements,
    weatherLayer,
    cannotSay:
      'How much rain fell, where it fell, and whether soil moisture crossed any ' +
      'threshold. The manifest this report is built from carries the score ' +
      'distributions and the provenance of the weather fetch — it does not carry the ' +
      'weather values themselves, and it has no regional breakdown of any kind. A ' +
      'sentence like “the coast took 24 mm over three days” would be written from ' +
      'imagination rather than from the run, so this report does not write one. Adding ' +
      'per-region precipitation and soil-moisture summaries to the manifest is what ' +
      'would make it possible.',
    warnings: m.warnings ?? [],
    publishNotes: run.publish_notes ?? [],
  };
}

// ---------------------------------------------------------------------------
// Cross-links into the main catalog
// ---------------------------------------------------------------------------

import catalog from '../../data/species.json';

/**
 * The catalog page for a mapped species, when the catalog has that taxon.
 *
 * Matched on the accepted binomial, not on the pipeline's own id — the two
 * datasets were built independently and the ids do not always agree (the
 * chanterelle profile is filed under `cantharellus_cibarius` but names
 * *Cantharellus formosus*, which is the taxon the catalog would hold). Five of
 * the seventeen profiles have no catalog entry; they simply get no link rather
 * than a guess at a near-miss.
 */
const catalogBySpecies: Record<string, string> = Object.fromEntries(
  (catalog as Array<{ slug: string; accepted?: string }>)
    .filter((r) => r.accepted)
    .map((r) => [r.accepted!.toLowerCase(), r.slug])
);

export function catalogUrl(profile: SpeciesProfile): string | null {
  const sci = (profile.scientific_name ?? '').toLowerCase().trim();
  const slug = catalogBySpecies[sci];
  return slug ? `/species/${slug}` : null;
}

// ---------------------------------------------------------------------------
// Look-alikes
// ---------------------------------------------------------------------------

export interface LookAlike {
  text: string;
  /** true when the profile recorded only an identifier, with no description. */
  bare: boolean;
}

/**
 * Present a look-alike as the profile wrote it.
 *
 * Some profiles record a full sentence about the confusion and the risk; others
 * record only a bare identifier like "jack_o_lantern". Bare ids get their
 * underscores removed and nothing else — inventing a toxicity note the profile
 * does not carry would be putting words about edibility into a dataset that
 * never said them. They are also FLAGGED, because an identifier with no
 * symptoms and no distinguishing feature is not usable safety information and
 * the page should not let it look like it is.
 */
export function lookAlike(raw: string): LookAlike {
  const s = (raw ?? '').trim();
  if (s.split(/\s+/).length > 3) return { text: s, bare: false };
  return { text: s.replace(/_/g, ' '), bare: true };
}

export function bareLookAlikes(profile: SpeciesProfile): string[] {
  return (profile.look_alikes ?? []).map(lookAlike).filter((l) => l.bare).map((l) => l.text);
}

/** Every species whose profile records a look-alike as a bare identifier. */
export function speciesWithBareLookAlikes(): Array<{ id: string; name: string; bare: string[] }> {
  return Object.values(profiles)
    .map((p) => ({ id: p.id, name: p.common_name ?? p.id, bare: bareLookAlikes(p) }))
    .filter((x) => x.bare.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Misc presentation
// ---------------------------------------------------------------------------

/** Capitalise a fragment lifted out of a JSON note so it reads as prose. */
export function sentenceCase(text?: string): string {
  const t = (text ?? '').trim();
  if (!t) return t;
  return t[0] === t[0].toUpperCase() ? t : t[0].toUpperCase() + t.slice(1);
}

export function prettyField(raw: string): string {
  const t = (raw ?? '').trim();
  return t.includes(' ') ? t : t.replace(/_/g, ' ');
}

/** Roster order: species in the run first, then by how well each is known. */
export function rosterOrder(inRun: Set<string>): SpeciesProfile[] {
  const rank: Record<StatusKind, number> = { measured: 0, unmeasured: 1, excluded: 2 };
  return Object.values(profiles).sort((a, b) => {
    const runDelta = (inRun.has(a.id) ? 0 : 1) - (inRun.has(b.id) ? 0 : 1);
    if (runDelta) return runDelta;
    const statusDelta = rank[evidentialStatus(a.id).kind] - rank[evidentialStatus(b.id).kind];
    if (statusDelta) return statusDelta;
    return (a.common_name ?? a.id).localeCompare(b.common_name ?? b.id);
  });
}
