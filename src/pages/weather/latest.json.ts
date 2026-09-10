/**
 * /weather/latest.json — the freshness pointer, and the section's JSON twin.
 *
 * Every page on this site is also an endpoint; the weather section is no
 * exception. This carries what the page's own freshness strip carries — the
 * as_of date that leads, the target date that only labels — plus the image
 * URLs and the digests behind them, so anything reading this can check what it
 * was served.
 */
import type { APIRoute } from 'astro';
import { MAPS_BASE_URL, currentRun, latest, runs } from '../../lib/weather';

export const GET: APIRoute = () => {
  const run = currentRun;
  const body = {
    as_of_date: latest.as_of_date,
    target_date: latest.target_date,
    lag_days_behind_target: latest.lag_days_behind_target,
    published_at: latest.published_at,
    publishable: latest.publishable,
    manifest_sha256: latest.manifest_sha256,
    maps_base_url: MAPS_BASE_URL,
    // Enrichment ratios, never probabilities. See /weather/limits.
    species: (run?.manifest.species ?? []).map((sp) => {
      const img = run?.images?.find((i) => i.id === sp.id);
      return {
        id: sp.id,
        common_name: sp.common_name,
        scientific_name: sp.scientific_name,
        pixels_assessed: sp.pixels_assessed,
        pixels_painted: sp.pixels_painted,
        painted_p50: sp.painted_p50,
        painted_p95: sp.painted_p95,
        max_score: sp.max_score,
        render_sha256: sp.sha256,
        image_url: img?.url_path ? `${MAPS_BASE_URL}/${img.url_path}` : null,
        image_sha256: img?.published_sha256 ?? null,
        image_confirmed_on_origin: img?.origin_verified ?? null,
      };
    }),
    runs_on_record: runs.map((r) => r.as_of_date),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
