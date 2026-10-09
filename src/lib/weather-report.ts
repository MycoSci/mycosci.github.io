/**
 * weather-report.ts — the presentation layer for a conventional weather report.
 *
 * WHY THIS FILE EXISTS
 *
 * The pipeline began emitting `manifest.weather_summary` — ten named Oregon
 * regions plus a statewide roll-up, each carrying precipitation windows,
 * soil-moisture state against the model's own abort/field-capacity thresholds,
 * air and soil temperature, and the change since the previous run. No page had
 * ever read it. Meanwhile /weather still printed, in its own words, that
 * "rainfall totals, and anything by region" were things it could not say and
 * that adding them to the manifest "is what would let this report say it."
 * They were added. The page had not noticed. That stale disclaimer is the
 * defect this file closes.
 *
 * THE RULES IT INHERITS, which are not decorations
 *
 *   1. The weather lattice is 0.4 degrees and INTERPOLATED. Every number in
 *      this file is a mean over 0.4-degree cells, which is coarser than the
 *      pixels the map draws. A regional table makes that easy to forget, so
 *      `latticeCaveat()` is derived from the run's own warning and belongs
 *      attached to the figures, not filed at the bottom of the page.
 *   2. A region the run flagged `thin` must be reported WITH its point count
 *      or not at all. That is the run's own instruction, in its own warnings:
 *      "their figures are flagged thin and must be reported with the point
 *      count or not at all." `regionRows()` carries the count on every row and
 *      the flag on the thin ones.
 *   3. Nothing here is a probability and nothing here is a forecast unless the
 *      run says it is. `runKind()` reads the run record; it never guesses.
 *   4. Absent data returns null and the page says so. There is no default,
 *      no carry-forward from an earlier run, and no interpolated value for a
 *      day the pipeline did not produce.
 */
import type { Manifest, RunRecord, SpeciesProfile } from './weather';
import { profiles, runs } from './weather';

// ---------------------------------------------------------------------------
// Shapes — the data lane's, transcribed rather than invented
// ---------------------------------------------------------------------------

export interface PrecipWindow {
  days: number;
  days_used?: number;
  points_used?: number;
  mean_in?: number;
  min_in?: number;
  max_in?: number;
  prior_window_mean_in?: number | null;
  change_vs_prior_window_in?: number | null;
  forecast_days_in_window?: number;
}

export interface RegionSummary {
  id: string;
  name: string;
  definition?: string;
  grid_points: number;
  /** The run's own flag for "too few points to average honestly". */
  thin?: boolean;
  extent?: { elev_min_ft?: number; elev_mean_ft?: number; elev_max_ft?: number };
  days_available?: number;
  first_day?: string;
  last_day?: string;
  /** Days in this region's series that came from a forecast rather than an archive. */
  forecast_days?: string[];
  precip?: {
    windows?: PrecipWindow[];
    wet_days_last_7_mean?: number;
    wet_day_threshold_in?: number;
    days_since_measurable_rain_median?: number | null;
    days_since_measurable_rain_max?: number | null;
  };
  soil_moisture?: {
    latest_mean_vwc?: number;
    trailing_3d_mean_vwc?: number;
    change_over_7d_vwc?: number;
    pct_at_or_above_field_capacity?: number;
    pct_at_or_above_abort_floor?: number;
    state?: string;
    field_capacity_crossing?: { state?: string; on_date?: string | null; days_ago?: number | null };
    abort_floor_crossing?: { state?: string; on_date?: string | null; days_ago?: number | null };
    consecutive_days_at_or_above_abort_floor?: number;
  };
  air_temp_f?: TempBlock;
  soil_temp_f?: TempBlock;
  change_since_previous_run?: Record<string, number> | null;
}

export interface TempBlock {
  trailing_3d_mean_f?: number;
  min_daily_min_last_7d_f?: number;
  max_daily_max_last_7d_f?: number;
  extremes_basis?: string;
  change_vs_7d_ago_f?: number;
  /** The field name says it: POSITIVE means cooling. Negative means warming. */
  cooling_trend_f_positive_is_cooling?: number;
}

export interface WeatherSummary {
  schema_version?: number;
  usable?: boolean;
  as_of_date?: string;
  first_day?: string;
  observed_through_day?: string;
  last_observed_hour_utc?: string;
  /** False on every run published so far. The forecast lane has not landed. */
  includes_forecast_days?: boolean;
  forecast_days?: string[];
  windows_days?: number[];
  thresholds?: {
    soil_moisture_abort_floor_vwc?: number;
    soil_moisture_field_capacity_vwc?: number;
    soil_moisture_saturated_vwc?: number;
    wet_day_precip_in?: number;
    probe_verified?: boolean;
    source?: string;
  };
  region_scheme?: { name?: string; description?: string; aggregation?: string };
  statewide?: RegionSummary;
  regions?: RegionSummary[];
  grid_points?: Record<string, number | boolean>;
}

/** The run's weather summary, or null on a run published before the schema existed. */
export function summaryFor(run?: RunRecord | null): WeatherSummary | null {
  const ws = (run?.manifest as Manifest | undefined)?.weather_summary;
  if (!ws || typeof ws !== 'object') return null;
  // `usable: false` means the pipeline itself would not stand behind the
  // aggregation. Treat it as absent rather than print it with a hedge.
  if (ws.usable === false) return null;
  return ws as WeatherSummary;
}

// ---------------------------------------------------------------------------
// Observed, or forecast — the distinction that must be visible
// ---------------------------------------------------------------------------

/**
 * Whether this run describes weather that HAPPENED or weather that MIGHT.
 *
 * A retrospective map and a forecast map must not look the same: one says
 * conditions have been right, the other that they may be. The page renders
 * that difference; this function decides it, and it decides it only from
 * fields the run record actually carries:
 *
 *   manifest.weather.allow_forecast_hours   — how many forecast hours the
 *                                             scorer was permitted to use
 *   weather_summary.includes_forecast_days  — whether any summarised day came
 *                                             from a forecast
 *   weather_summary.forecast_days           — which ones
 *
 * Every run published to date is 'observed': allow_forecast_hours is 0 and
 * forecast_days is empty. When the data lane lands the forecast, it may well
 * name the distinction differently — an explicit `run_kind`, say. If it does,
 * THIS FUNCTION is the single place to teach it, and the page needs no change.
 */
export type RunKind = 'observed' | 'mixed' | 'forecast';

export interface RunKinding {
  kind: RunKind;
  /** The badge word. Short, because it sits next to the date. */
  label: string;
  /** Past tense for observed, conditional for forecast. Used in prose. */
  verb: string;
  /** One sentence saying which it is and how we know. */
  detail: string;
  forecastDays: string[];
  forecastHours: number;
}

export function runKind(run: RunRecord): RunKinding {
  const hours = Number(run.manifest?.weather?.allow_forecast_hours ?? 0) || 0;
  const ws = summaryFor(run);
  const days = Array.isArray(ws?.forecast_days) ? ws!.forecast_days! : [];
  const flagged = ws?.includes_forecast_days === true;

  // An explicit run_kind, should the data lane add one, wins over inference.
  const declared = (run.manifest as any)?.run_kind ?? (run as any)?.run_kind;
  if (declared === 'forecast' || declared === 'observed' || declared === 'mixed') {
    return kinding(declared, days, hours);
  }

  if (!hours && !flagged && !days.length) return kinding('observed', days, hours);
  if (days.length && ws?.observed_through_day && ws.observed_through_day < (ws.as_of_date ?? '')) {
    return kinding('forecast', days, hours);
  }
  return kinding('mixed', days, hours);
}

function kinding(kind: RunKind, forecastDays: string[], forecastHours: number): RunKinding {
  if (kind === 'observed') {
    return {
      kind,
      label: 'Observed',
      verb: 'have been',
      detail:
        'Every hour behind this run is observed weather out of the archive. No forecast hour ' +
        'was scored, so this map describes conditions that already happened.',
      forecastDays,
      forecastHours,
    };
  }
  if (kind === 'forecast') {
    return {
      kind,
      label: 'Forecast',
      verb: 'may be',
      detail:
        `This run was scored partly on forecast weather — ${forecastDays.length} forecast ` +
        `day${forecastDays.length === 1 ? '' : 's'} and ${forecastHours} forecast hour` +
        `${forecastHours === 1 ? '' : 's'}. It describes conditions that may arrive, not ` +
        'conditions that did. A forecast can be wrong in a way an archive cannot.',
      forecastDays,
      forecastHours,
    };
  }
  return {
    kind,
    label: 'Part forecast',
    verb: 'have been, and may be',
    detail:
      `This run mixes observed weather with ${forecastHours} forecast hour` +
      `${forecastHours === 1 ? '' : 's'}${
        forecastDays.length ? ` across ${forecastDays.length} day(s)` : ''
      }. The earlier part of its window happened; the later part is projected.`,
    forecastDays,
    forecastHours,
  };
}

// ---------------------------------------------------------------------------
// The lattice caveat — read from the run, never typed in
// ---------------------------------------------------------------------------

/**
 * The run's own resolution warning, verbatim.
 *
 * The pipeline emits a warning of the form "resolution: pixels 1440 ft; land
 * cover 256 ft; elevation 262 ft; WEATHER 104822 ft (0.4 deg lattice,
 * interpolated, not downscaled to terrain) — the ground detail in this map is
 * real, the weather behind it is regional". Returning it rather than
 * paraphrasing it is deliberate: the numbers are the run's, they have already
 * changed once (the elevation layer was resampled between September runs), and
 * a figure retyped into a component is a figure that goes quietly stale.
 */
export function latticeCaveat(run?: RunRecord | null): string | null {
  const w = (run?.manifest?.warnings ?? []).find((x) => /^resolution:/i.test(String(x)));
  return w ? String(w) : null;
}

/** The weather lattice spacing in degrees, as the run recorded it. */
export function latticeStepDegrees(run?: RunRecord | null): number | null {
  const s = Number(run?.manifest?.weather?.step_degrees);
  return Number.isFinite(s) && s > 0 ? s : null;
}

// ---------------------------------------------------------------------------
// Soil moisture, in words, against the model's own thresholds
// ---------------------------------------------------------------------------

export interface MoistureReading {
  /** Short words for the state, for a table cell. */
  label: string;
  /** What that state means for fruiting, in one clause. */
  meaning: string;
  /** 'dry' | 'marginal' | 'wet' — drives the row's emphasis, not a score. */
  tone: 'dry' | 'marginal' | 'wet' | 'unknown';
}

/**
 * The soil-moisture state in plain words.
 *
 * The state strings come from the pipeline and are mapped here one to one. An
 * unrecognised state is prettified and marked unknown rather than bucketed
 * into the nearest familiar one — a new state name is the data lane telling us
 * something, and guessing which bucket it belongs in would hide that.
 */
export function moisture(state?: string): MoistureReading {
  switch (state) {
    case 'below_abort_floor':
      return {
        label: 'Below abort floor',
        meaning: 'too dry to hold pins — a flush already started here would abort',
        tone: 'dry',
      };
    case 'between_abort_floor_and_field_capacity':
      return {
        label: 'Holding, below field capacity',
        meaning: 'wet enough to incubate, not wet enough to have started a new clock',
        tone: 'marginal',
      };
    case 'at_or_above_field_capacity':
      return {
        label: 'At field capacity',
        meaning: 'wet-up conditions — this is where the fruiting clock starts',
        tone: 'wet',
      };
    default:
      return {
        label: state ? state.replace(/_/g, ' ') : 'Not recorded',
        meaning: state
          ? 'a soil-moisture state this page has no wording for yet'
          : 'no soil-moisture reading in this run',
        tone: 'unknown',
      };
  }
}

// ---------------------------------------------------------------------------
// Rows for the regional table
// ---------------------------------------------------------------------------

export interface RegionRow {
  id: string;
  name: string;
  definition?: string;
  points: number;
  thin: boolean;
  isStatewide: boolean;
  rain7in: number | null;
  rain30in: number | null;
  rain7Change: number | null;
  wetDays7: number | null;
  daysSinceRain: number | null;
  vwc: number | null;
  moisture: MoistureReading;
  soilTempF: number | null;
  airTempF: number | null;
  /** Positive = cooling, which is the direction fruiting wants in autumn. */
  coolingF: number | null;
  elevMeanFt: number | null;
  /** Days in this region's window that came from a forecast. */
  forecastDays: string[];
}

const win = (r: RegionSummary, days: number): PrecipWindow | undefined =>
  (r.precip?.windows ?? []).find((w) => w.days === days);

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function toRow(r: RegionSummary, isStatewide: boolean): RegionRow {
  const w7 = win(r, 7);
  const w30 = win(r, 30);
  return {
    id: r.id,
    name: r.name,
    definition: r.definition,
    points: Number(r.grid_points) || 0,
    thin: r.thin === true,
    isStatewide,
    rain7in: num(w7?.mean_in),
    rain30in: num(w30?.mean_in),
    rain7Change: num(w7?.change_vs_prior_window_in),
    wetDays7: num(r.precip?.wet_days_last_7_mean),
    daysSinceRain: num(r.precip?.days_since_measurable_rain_median),
    vwc: num(r.soil_moisture?.latest_mean_vwc),
    moisture: moisture(r.soil_moisture?.state),
    soilTempF: num(r.soil_temp_f?.trailing_3d_mean_f),
    airTempF: num(r.air_temp_f?.trailing_3d_mean_f),
    coolingF: num(r.soil_temp_f?.cooling_trend_f_positive_is_cooling),
    elevMeanFt: num(r.extent?.elev_mean_ft),
    forecastDays: Array.isArray(r.forecast_days) ? r.forecast_days : [],
  };
}

/**
 * Statewide first, then the regions wettest-first.
 *
 * Wettest-first rather than alphabetical, because the question a forager
 * brings to a regional table is "where did it rain", and a table sorted by the
 * answer costs them no scanning. Thin regions are NOT demoted — hiding a
 * region because it has four grid points would be worse than flagging it.
 */
export function regionRows(ws: WeatherSummary | null): RegionRow[] {
  if (!ws) return [];
  const out: RegionRow[] = [];
  if (ws.statewide) out.push(toRow(ws.statewide, true));
  const rest = (ws.regions ?? [])
    .map((r) => toRow(r, false))
    .sort((a, b) => (b.rain7in ?? -1) - (a.rain7in ?? -1));
  return [...out, ...rest];
}

// ---------------------------------------------------------------------------
// The primary reading
// ---------------------------------------------------------------------------

export interface Reading {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: 'dry' | 'marginal' | 'wet' | 'unknown' | 'plain';
}

/**
 * The four numbers a weather report leads with, chosen for THIS model.
 *
 * A conventional report leads with temperature because that is what its reader
 * came for. The reader of a fruiting map came for the fruiting clock, and the
 * clock is driven by soil moisture against the abort floor, how long since
 * rain, and whether soil temperature is falling. So those lead, and the air
 * temperature — the number a weather report would put first — comes last,
 * because it is the least load-bearing one here.
 */
export function headlineReadings(ws: WeatherSummary | null): Reading[] {
  const sw = ws?.statewide;
  if (!sw) return [];
  const row = toRow(sw, true);
  const th = ws?.thresholds ?? {};
  const out: Reading[] = [];

  out.push({
    label: 'Soil moisture',
    value: row.vwc != null ? row.vwc.toFixed(3) : '—',
    unit: 'vwc',
    note:
      row.vwc != null && th.soil_moisture_abort_floor_vwc != null
        ? `${row.moisture.label.toLowerCase()} · floor ${th.soil_moisture_abort_floor_vwc}, field capacity ${th.soil_moisture_field_capacity_vwc ?? '—'}`
        : row.moisture.label.toLowerCase(),
    tone: row.moisture.tone,
  });

  out.push({
    label: 'Rain, last 7 days',
    value: row.rain7in != null ? row.rain7in.toFixed(2) : '—',
    unit: 'in',
    note:
      row.wetDays7 != null && th.wet_day_precip_in != null
        ? `${row.wetDays7.toFixed(1)} wet days (over ${th.wet_day_precip_in} in)`
        : undefined,
    tone: 'plain',
  });

  out.push({
    label: 'Since measurable rain',
    value: row.daysSinceRain != null ? String(row.daysSinceRain) : '—',
    unit: row.daysSinceRain === 1 ? 'day' : 'days',
    note: 'median across grid points',
    tone: 'plain',
  });

  out.push({
    label: 'Soil temperature',
    value: row.soilTempF != null ? row.soilTempF.toFixed(1) : '—',
    unit: '°F',
    note:
      row.coolingF != null
        ? row.coolingF > 0
          ? `cooling ${row.coolingF.toFixed(1)}°F`
          : row.coolingF < 0
            ? `warming ${Math.abs(row.coolingF).toFixed(1)}°F`
            : 'flat'
        : '3-day mean',
    tone: 'plain',
  });

  return out;
}

/**
 * One sentence saying what the state's weather is doing, assembled from the
 * statewide roll-up and nothing else.
 *
 * Deliberately a lede and not a verdict. The statewide block carries its own
 * warning about this — "the state spans a rainforest and a desert, so this is
 * a lede, not a forecast" — and that sentence is rendered next to it.
 */
export function conditionsLede(ws: WeatherSummary | null, kinding: RunKinding): string | null {
  const sw = ws?.statewide;
  if (!sw) return null;
  const row = toRow(sw, true);
  const bits: string[] = [];

  if (row.daysSinceRain != null && row.rain7in != null) {
    bits.push(
      row.rain7in < 0.05
        ? `Oregon is dry: ${row.rain7in.toFixed(2)} inches statewide over seven days, a median ${row.daysSinceRain} days since measurable rain`
        : `${row.rain7in.toFixed(2)} inches of rain statewide over seven days, a median ${row.daysSinceRain} days since the last measurable fall`
    );
  }

  if (row.vwc != null) {
    const pctFloor = num(sw.soil_moisture?.pct_at_or_above_abort_floor);
    bits.push(
      pctFloor != null
        ? `soil moisture averaging ${row.vwc.toFixed(3)} vwc with ${pctFloor.toFixed(0)}% of grid points at or above the abort floor`
        : `soil moisture averaging ${row.vwc.toFixed(3)} vwc`
    );
  }

  if (row.soilTempF != null && row.coolingF != null) {
    bits.push(
      row.coolingF > 0
        ? `and soil at ${row.soilTempF.toFixed(1)}°F, cooling ${row.coolingF.toFixed(1)}°F`
        : `and soil at ${row.soilTempF.toFixed(1)}°F, warming ${Math.abs(row.coolingF).toFixed(1)}°F`
    );
  }

  if (!bits.length) return null;
  const sentence = bits.join(', ').replace(/, and /, ' and ');
  const tail =
    kinding.kind === 'observed'
      ? ' These are observed readings, not a projection.'
      : ' Part of this window is projected rather than observed.';
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.' + tail;
}

// ---------------------------------------------------------------------------
// History — the time strip
// ---------------------------------------------------------------------------

export interface HistoryPoint {
  asOf: string;
  targetDate?: string;
  kind: RunKind;
  kindLabel: string;
  /** Share of assessed ground painted for the selected species, 0..1. */
  paintedShare: number | null;
  maxScore: number | null;
  /** True when this run carried no row for the species at all. */
  speciesAbsent: boolean;
  /** Days between this run and the one before it on record. */
  gapToPrevious: number | null;
  /** Statewide soil moisture on that run, where the run carried a summary. */
  vwc: number | null;
  rain7in: number | null;
  /** Whether this run's image for the species is addressable. */
  imagePath: string | null;
}

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/**
 * Every published run, oldest first, as a strip the reader can scan.
 *
 * This is the whole of the "historical" capability that exists today, and it
 * is worth being exact about what it is: the numbers from every run the
 * pipeline ever published, which is nine runs with a fourteen-month hole in
 * the middle. It is NOT a daily series. Gaps are rendered as gaps —
 * `gapToPrevious` is why — because a strip that spaces nine runs evenly would
 * draw a smooth autumn out of four days in September and five in October.
 */
export function history(speciesId: string): HistoryPoint[] {
  return runs.map((r, i) => {
    const sp = (r.manifest.species ?? []).find((s) => s.id === speciesId);
    const assessed = sp?.pixels_assessed || 0;
    const k = runKind(r);
    const ws = summaryFor(r);
    const sw = ws?.statewide;
    const img = r.images?.find((x) => x.id === speciesId);
    return {
      asOf: r.as_of_date,
      targetDate: r.target_date,
      kind: k.kind,
      kindLabel: k.label,
      paintedShare: sp && assessed ? (sp.pixels_painted ?? 0) / assessed : null,
      maxScore: typeof sp?.max_score === 'number' ? sp.max_score : null,
      speciesAbsent: !sp,
      gapToPrevious: i > 0 ? dayDiff(runs[i - 1].as_of_date, r.as_of_date) : null,
      vwc: num(sw?.soil_moisture?.latest_mean_vwc),
      rain7in: sw ? num(win(sw, 7)?.mean_in) : null,
      imagePath: img?.url_path ?? null,
    };
  });
}

/**
 * What the forecast lane can say today, which is nothing, said out loud.
 *
 * The run record carries the hooks — `includes_forecast_days`, `forecast_days`,
 * `allow_forecast_hours` — and all three are empty or zero on every run
 * published so far. So the page renders an empty forecast lane WITH ITS REASON
 * rather than omitting the lane, because a missing lane reads as "forecasts
 * are not part of this product" and an empty one reads as "not yet".
 */
export interface ForecastState {
  available: boolean;
  days: string[];
  horizonDays: number | null;
  reason: string;
}

export function forecastState(run?: RunRecord | null): ForecastState {
  const ws = summaryFor(run);
  const days = Array.isArray(ws?.forecast_days) ? ws!.forecast_days! : [];
  const hours = Number(run?.manifest?.weather?.allow_forecast_hours ?? 0) || 0;
  if (days.length) {
    return {
      available: true,
      days,
      horizonDays: days.length,
      reason: `${days.length} forecast day(s) in this run's window.`,
    };
  }
  return {
    available: false,
    days: [],
    horizonDays: null,
    reason:
      `This run scored ${hours} forecast hours and summarised no forecast days ` +
      '(includes_forecast_days: false). The pipeline reads a weather ARCHIVE, which settles ' +
      'about a day after the fact, so every map here describes weather that already happened. ' +
      'Forecast days will appear in this lane when the run record starts carrying them, and ' +
      'they will be drawn differently from observed days — see the key below.',
  };
}

// ---------------------------------------------------------------------------
// Species selection
// ---------------------------------------------------------------------------

/**
 * Whether a profile's own season covers a given month.
 *
 * Read from `season.months`, which is an array of month numbers written into
 * the profile by hand. EIGHT of the seventeen profiles have `season: null` —
 * they are not out of season, their season is not recorded — and this returns
 * null for them so the page can say which. Inferring a season from the
 * substrate or from the species' name would be making up the one field a
 * forager would most reasonably trust.
 */
export function inSeason(profile: SpeciesProfile, month: number): boolean | null {
  const months = profile.season?.months;
  if (!Array.isArray(months) || !months.length) return null;
  return months.includes(month);
}

export type SeasonGroupId = 'in-season' | 'off-season' | 'unrecorded';

export interface SpeciesGroup {
  id: SeasonGroupId;
  title: string;
  /** Why these are grouped together, and where the grouping came from. */
  note: string;
  members: Array<{
    id: string;
    profile: SpeciesProfile;
    name: string;
    scientific: string;
    /** Where to look, from the profile's substrate. A real forager axis. */
    substrate: string;
    inRun: boolean;
    /** Painted share in the current run, for a one-glance comparison. */
    paintedShare: number | null;
    maxScore: number | null;
  }>;
}

const SUBSTRATE_WORDS: Record<string, string> = {
  mycorrhizal: 'on the ground, with trees',
  saprotrophic: 'on the ground, in litter',
  deadwood: 'on dead wood',
  parasitic: 'on or near a host',
};

export function substrateWords(substrate?: string): string {
  const s = (substrate ?? '').trim();
  if (!s) return 'habitat not recorded';
  return SUBSTRATE_WORDS[s] ?? s.replace(/_/g, ' ');
}

/**
 * All seventeen species, grouped the way a forager would ask for them.
 *
 * Grouped by SEASON rather than alphabetically, because "what is out now" is
 * the first question and an alphabetical list answers it last. The month is
 * the RUN's month, not the reader's: this is a static page and a selector that
 * reorganised itself at midnight in the reader's timezone would disagree with
 * the map beside it.
 *
 * Edibility was the other candidate axis and was rejected on inspection: all
 * seventeen profiles record `choice`, `edible` or `edible_with_caution`, so
 * grouping by it would produce one large pile and two small ones and tell a
 * reader nothing. Substrate — ground, wood, or host — is carried on every row
 * instead, because that is the other thing you need before you set out.
 */
export function speciesGroups(run: RunRecord): SpeciesGroup[] {
  const month = Number(run.as_of_date.slice(5, 7));
  const rows = run.manifest.species ?? [];
  const byId = new Map(rows.map((s) => [s.id, s]));

  const buckets: Record<SeasonGroupId, SpeciesGroup['members']> = {
    'in-season': [],
    'off-season': [],
    unrecorded: [],
  };

  for (const profile of Object.values(profiles)) {
    const sp = byId.get(profile.id);
    const assessed = sp?.pixels_assessed || 0;
    const member = {
      id: profile.id,
      profile,
      name: sp?.common_name ?? profile.common_name ?? profile.id,
      scientific: sp?.scientific_name ?? profile.scientific_name ?? '',
      substrate: substrateWords(profile.substrate),
      inRun: Boolean(sp),
      paintedShare: sp && assessed ? (sp.pixels_painted ?? 0) / assessed : null,
      maxScore: typeof sp?.max_score === 'number' ? sp.max_score : null,
    };
    const season = inSeason(profile, month);
    if (season === null) buckets.unrecorded.push(member);
    else if (season) buckets['in-season'].push(member);
    else buckets['off-season'].push(member);
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const monthName = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    [
      {
        id: 'in-season' as SeasonGroupId,
        title: `In season in ${monthName}`,
        note: `Their own profile lists ${monthName} among its fruiting months.`,
        members: buckets['in-season'].sort(byName),
      },
      {
        id: 'unrecorded' as SeasonGroupId,
        title: 'Season not recorded',
        note:
          'These profiles carry no season field at all. That is a gap in the dataset, not a ' +
          'statement that they are out of season — their maps are rendered and scored exactly ' +
          'like the rest.',
        members: buckets.unrecorded.sort(byName),
      },
      {
        id: 'off-season' as SeasonGroupId,
        title: `Outside their season in ${monthName}`,
        note:
          'Still mapped, and still scored on the same weather. The model reads weather, not a ' +
          'calendar, so a species can score well outside the months its profile lists.',
        members: buckets['off-season'].sort(byName),
      },
    ] as SpeciesGroup[]
  ).filter((g) => g.members.length > 0);
}

/**
 * Which species the page opens on.
 *
 * The best-evidenced species in the run, which is the one the headline claim
 * already belongs to — so the page's opening map and its opening number are
 * about the same mushroom. Falls back to the first rendered species.
 */
export function defaultSpeciesId(run: RunRecord, preferred?: string): string | null {
  const rows = run.manifest.species ?? [];
  if (preferred && rows.some((s) => s.id === preferred)) return preferred;
  return rows[0]?.id ?? null;
}
