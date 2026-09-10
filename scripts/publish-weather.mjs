#!/usr/bin/env node
/**
 * publish-weather.mjs — take one completed MycoMap run and publish it here.
 *
 *   node scripts/publish-weather.mjs [options]
 *
 *     --mycomap <path>   the Go pipeline repo (default: ~/Documents/GitHub/
 *                        BlueFrogAnalytics/sandbox/mycomap)
 *     --date <YYYY-MM-DD>  publish a specific run directory instead of the one
 *                        latest.json points at. For backfilling the record
 *                        from runs already on disk; it only moves the pointer
 *                        if the run is newer than the current one.
 *     --upload           rsync the converted images to the map origin
 *     --commit           commit data/weather to the current branch
 *     --push             commit and push (implies --commit); triggers the
 *                        Pages deploy
 *     --force            re-publish a run already published
 *     --dry-run          read, verify, report; write nothing
 *
 * WHAT THIS IS
 *
 * The bridge between two repositories and one image origin. The renders are
 * produced by the Go pipeline in `sandbox/mycomap`; the website is this repo;
 * the map images are served from a host we control (MISTY, behind Caddy).
 * This script reads what the pipeline already produced, converts what belongs
 * on a web page, ships the images to the origin, writes the numbers here, and
 * — only when asked — commits and pushes.
 *
 * It recomputes nothing. No scoring, no thresholds, no re-derivation of
 * anything the renderer measured. Every number that reaches the site can be
 * traced to a field in a manifest.json.
 *
 * WHAT IT REFUSES TO DO
 *
 *   * Publish a run whose latest.json or manifest.json says publishable=false.
 *     The pipeline exits non-zero rather than emit a degraded map; papering
 *     over that here would undo the only safety property the pipeline has.
 *   * Publish an image that does not match its manifest SHA-256. The manifest
 *     makes a checkable claim, so it gets checked, before conversion.
 *   * Guess which freshness claim is true when latest.json and its manifest
 *     disagree about as_of_date.
 *   * Re-publish a run it has already published (idempotent; --force overrides).
 *   * Claim an image reached the origin when it did not. The record carries
 *     the verification result, including the failure, and the site reads it.
 *
 * WHERE THINGS GO
 *
 *   data/weather/runs/<as_of>.json   run record: manifest + digests + image
 *                                    URLs. ~4 KB. COMMITTED, kept forever —
 *                                    this is the history that makes the later
 *                                    "historical and future projections"
 *                                    phase cheap.
 *   data/weather/latest.json         pointer to the newest run. COMMITTED.
 *   data/weather/profiles.json       species profiles snapshot. COMMITTED.
 *   data/weather/validation.json     standing band analysis snapshot. COMMITTED.
 *   .weather-out/<as_of>/…           converted images, staged for upload.
 *                                    GITIGNORED. No map image is ever
 *                                    committed to this repository.
 *
 * IMAGE URLS ARE CONTENT-ADDRESSED BY RUN AND DIGEST
 *
 *   <base>/<as_of>/<sha12>-<filename>.png
 *
 * ORIGIN RETENTION IS THE ORIGIN'S JOB
 *
 * The upload below is additive — it never deletes an older day. The site only
 * ever references the current run, so nothing breaks if old days are removed,
 * but nothing removes them either: at 16 species that is ~8 MB a day, ~2.9 GB
 * a year, accumulating on the map host. Put a retention sweep on the origin
 * (e.g. `find /srv/mycomap-maps -mindepth 1 -maxdepth 1 -type d -mtime +14
 * -exec rm -rf {} +` on a daily timer) and keep whatever window the later
 * historical phase will want. Deleting a day the site is not pointing at is
 * always safe; deleting today's is not.
 *
 * The date and the digest are both in the path, so an origin that has not yet
 * received today's render can only return 404. It can never serve yesterday's
 * map under today's date, which is the failure this whole project keeps
 * producing. The site does not construct that path itself — it reads the
 * `url_path` this script recorded, so the layout lives in exactly one place.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');

const DEFAULT_MYCOMAP = path.join(
  os.homedir(),
  'Documents/GitHub/BlueFrogAnalytics/sandbox/mycomap'
);

/**
 * Where the images are served from, and where they are shipped to.
 *
 * Both are configuration, in one place, because the hostname is not settled.
 * PUBLIC_MAPS_BASE_URL is read again at site build time (src/lib/weather.ts);
 * keep the two in the same .env and they cannot drift.
 */
const MAPS_BASE_URL = (process.env.PUBLIC_MAPS_BASE_URL || 'https://maps.mycosci.com').replace(
  /\/+$/,
  ''
);
/** rsync destination, e.g. josh@192.168.1.200:/srv/mycomap-maps/ */
const MAPS_RSYNC_DEST = process.env.MYCOMAP_MAPS_RSYNC_DEST || '';

/** Colours in the published rendition. 256 is measured — see the report. */
const PALETTE_COLOURS = 256;

/**
 * The score ramp, transcribed from cmd/render/main.go.
 * Kept here so the check below can tell us when the renderer's ramp moves and
 * the site's CSS legend does not. The legend itself lives in src/lib/weather.ts.
 */
const RAMP_STOPS = [
  [0.0, 180, 140, 220],
  [0.25, 120, 60, 200],
  [0.5, 220, 40, 140],
  [0.75, 255, 120, 20],
  [1.0, 255, 240, 40],
];

class Refused extends Error {}

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const MYCOMAP = path.resolve(opt('mycomap', DEFAULT_MYCOMAP));
const DRY_RUN = flag('dry-run');
const FORCE = flag('force');
const DO_UPLOAD = flag('upload');
const DO_PUSH = flag('push');
const DO_COMMIT = flag('commit') || DO_PUSH;

const STAGING = path.join(SITE, '.weather-out');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: opts.cwd || SITE,
    encoding: 'utf8',
    stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
  });
}
const git = (args, opts = {}) => (run('git', args, opts) || '').trim();

// ---------------------------------------------------------------------------
// Load and gate
// ---------------------------------------------------------------------------

function loadLatest() {
  const p = path.join(MYCOMAP, 'out/latest.json');
  if (!fs.existsSync(p)) {
    throw new Refused(
      `${p} does not exist. The pipeline has not promoted a run yet; run cmd/dailymap first.`
    );
  }
  const latest = readJson(p);
  if (latest.publishable !== true) {
    throw new Refused(
      'out/latest.json says publishable=false. cmd/dailymap exits non-zero rather ' +
        'than emit a degraded map, and this script will not paper over that. Nothing ' +
        'was written; the site keeps serving the last run that was stood behind.'
    );
  }
  for (const field of ['date', 'as_of_date', 'manifest']) {
    if (!latest[field]) throw new Refused(`out/latest.json is missing required field "${field}"`);
  }
  return latest;
}

function loadManifest(rel) {
  const p = path.join(MYCOMAP, rel);
  if (!fs.existsSync(p)) {
    throw new Refused(`manifest ${rel} referenced by latest.json does not exist`);
  }
  const m = readJson(p);
  if (m.publishable !== true) {
    throw new Refused(
      `${rel} says publishable=false. Refusing to build a page for a run the renderer would not stand behind.`
    );
  }
  return m;
}

/**
 * Warn if cmd/render's ramp no longer matches the one the site draws.
 *
 * The site reproduces the renderer's legend in CSS so a reader can hold one
 * against the other. That is only true while the two agree, and this script is
 * the only place both are visible at once.
 */
function checkRamp() {
  const src = path.join(MYCOMAP, 'cmd/render/main.go');
  if (!fs.existsSync(src)) return ['cmd/render/main.go not found; could not verify the colour ramp'];
  const text = fs.readFileSync(src, 'utf8');
  const flat = text.replace(/ /g, '');
  const problems = [];
  for (const [, r, g, b] of RAMP_STOPS) {
    if (!flat.includes(`${r},${g},${b}`)) {
      problems.push(
        `ramp stop rgb(${r},${g},${b}) is not present in cmd/render/main.go; ` +
          'the legend drawn on this site may no longer match the one on the image'
      );
    }
  }
  if (/color\.RGBA\{\s*0\s*,\s*2[0-9]{2}/.test(text)) {
    problems.push('cmd/render/main.go appears to paint a saturated green again');
  }
  return problems;
}

/** species/*.json, keyed by id. host_only profiles are never surfaced. */
function loadProfiles() {
  const dir = path.join(MYCOMAP, 'species');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.json')) continue;
    let p;
    try {
      p = readJson(path.join(dir, name));
    } catch {
      continue;
    }
    if (p.host_only || !p.id) continue;
    out[p.id] = p;
  }
  return out;
}

/**
 * internal/species/score_bands.json — the STANDING validation record.
 *
 * Deliberately separate from a manifest's score_bands. The manifest describes
 * what a particular run was rendered with; this describes what has been
 * measured about each species, whether or not any run carried it. The site
 * uses it only to state evidential status, never to label a band on a map.
 */
function loadValidation() {
  const p = path.join(MYCOMAP, 'internal/species/score_bands.json');
  if (!fs.existsSync(p)) return null;
  try {
    return readJson(p);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Verify each render against its manifest digest, then stage a 256-colour
 * rendition for upload.
 *
 * The digest is checked on the ORIGINAL, before conversion — that is the
 * integrity claim the manifest actually makes. The published file is a derived
 * rendition and carries its own digest; the run record keeps both, so the page
 * can say which is which rather than implying the bytes a reader receives are
 * the bytes the renderer signed.
 */
async function convertImages(manifest, asOf, notes) {
  const dest = path.join(STAGING, asOf);
  if (!DRY_RUN) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
  }

  const images = [];
  for (const sp of manifest.species || []) {
    const rel = sp.file;
    if (!rel) continue;
    const src = path.join(MYCOMAP, rel);
    if (!fs.existsSync(src)) {
      notes.push(`${rel} is named in the manifest but missing on disk; not published`);
      continue;
    }
    const bytes = fs.readFileSync(src);
    const renderDigest = sha256(bytes);
    if (sp.sha256 && renderDigest !== sp.sha256) {
      notes.push(
        `${rel} does not match its manifest digest (manifest ${sp.sha256.slice(0, 12)}…, ` +
          `file ${renderDigest.slice(0, 12)}…); not published`
      );
      continue;
    }

    const base = path.basename(rel);
    if (DRY_RUN) {
      images.push({ id: sp.id, source_bytes: bytes.length, render_sha256: renderDigest });
      continue;
    }

    const converted = await sharp(bytes)
      .png({ palette: true, colours: PALETTE_COLOURS, quality: 100, effort: 10 })
      .toBuffer();
    const digest = sha256(converted);
    const name = `${digest.slice(0, 12)}-${base}`;
    fs.writeFileSync(path.join(dest, name), converted);
    const meta = await sharp(converted).metadata();

    images.push({
      id: sp.id,
      file: name,
      // The site joins this to the configured base URL. It never builds a path.
      url_path: `${asOf}/${name}`,
      width: meta.width,
      height: meta.height,
      source_bytes: bytes.length,
      published_bytes: converted.length,
      palette_colours: PALETTE_COLOURS,
      render_sha256: renderDigest,
      published_sha256: digest,
      origin_verified: null,
    });
  }
  return images;
}

/** rsync the staged day to the origin. Additive: never deletes older days. */
function uploadImages(asOf, notes) {
  if (!MAPS_RSYNC_DEST) {
    notes.push(
      'MYCOMAP_MAPS_RSYNC_DEST is not set, so the converted images were staged but not ' +
        'uploaded. The site will show the maps as not yet on the origin.'
    );
    return false;
  }
  const src = path.join(STAGING, asOf) + '/';
  const dest = MAPS_RSYNC_DEST.replace(/\/+$/, '') + `/${asOf}/`;
  try {
    run('rsync', ['-av', '--chmod=F644', src, dest], { stdio: 'inherit' });
    return true;
  } catch (err) {
    notes.push(`rsync to ${dest} failed: ${err.message.split('\n')[0]}`);
    return false;
  }
}

/**
 * Ask the origin whether it actually has each image, and record the answer.
 *
 * The site and the images can now fall out of sync in a way they could not
 * when both lived in one commit. A page that looks fresh over a 404 is the
 * exact failure this project keeps producing, so the run record carries the
 * verification result — including "we could not confirm" — and the page reads
 * it rather than assuming.
 */
async function verifyOrigin(images, notes) {
  for (const img of images) {
    if (!img.url_path) continue;
    const url = `${MAPS_BASE_URL}/${img.url_path}`;
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      img.origin_verified = res.ok;
      if (!res.ok) notes.push(`origin returned ${res.status} for ${url}`);
    } catch (err) {
      img.origin_verified = false;
      notes.push(`could not reach the map origin for ${url}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

function commitData(asOf) {
  const paths = ['data/weather'];
  git(['add', '--', ...paths]);
  const staged = git(['diff', '--cached', '--name-only', '--', ...paths]);
  if (!staged) {
    console.log('  nothing to commit (data unchanged)');
    return false;
  }
  git([
    'commit',
    '-q',
    '-m',
    `weather: publish run as of ${asOf}\n\n` +
      'Run record, provenance and score distributions only. Map images live on the\n' +
      'map origin and are never committed to this repository.',
  ]);
  console.log(`  committed data/weather (as of ${asOf})`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(MYCOMAP)) throw new Refused(`--mycomap path does not exist: ${MYCOMAP}`);

  const explicitDate = opt('date', '');
  let manifestRel;
  if (explicitDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
      throw new Refused(`--date must be YYYY-MM-DD, got "${explicitDate}"`);
    }
    manifestRel = `out/${explicitDate}/manifest.json`;
  } else {
    const latest = loadLatest();
    manifestRel = latest.manifest;
    const m = loadManifest(manifestRel);
    if (m.as_of_date !== latest.as_of_date) {
      throw new Refused(
        `latest.json and its manifest disagree about as_of_date (${latest.as_of_date} vs ` +
          `${m.as_of_date}). Refusing to guess which freshness claim is true.`
      );
    }
  }
  const manifest = loadManifest(manifestRel);

  const asOf = manifest.as_of_date;
  if (!asOf) throw new Refused(`${manifestRel} carries no as_of_date; refusing to guess one`);
  const manifestDigest = sha256(fs.readFileSync(path.join(MYCOMAP, manifestRel)));

  const dataDir = path.join(SITE, 'data/weather');
  const latestPath = path.join(dataDir, 'latest.json');
  const runPath = path.join(dataDir, 'runs', `${asOf}.json`);
  if (!FORCE && fs.existsSync(runPath)) {
    const prev = readJson(runPath);
    if (prev.manifest_sha256 === manifestDigest) {
      console.log(`already published: run as of ${asOf} (manifest unchanged). Nothing to do.`);
      console.log('Pass --force to rebuild it anyway.');
      return 0;
    }
  }

  const notes = checkRamp();
  const images = await convertImages(manifest, asOf, notes);

  const profiles = loadProfiles();
  const validation = loadValidation();
  if (!validation) {
    notes.push(
      'internal/species/score_bands.json is missing or unreadable; every species will be shown as unmeasured'
    );
  }

  if (DRY_RUN) {
    console.log(`DRY RUN — would publish run as of ${asOf}`);
    console.log(`  species  : ${(manifest.species || []).length}`);
    console.log(`  images   : ${images.length}`);
    for (const n of notes) console.log(`  WARNING  : ${n}`);
    return 0;
  }

  let uploaded = false;
  if (DO_UPLOAD) uploaded = uploadImages(asOf, notes);
  else
    notes.push(
      'images were converted and staged but not uploaded (--upload was not passed), so the ' +
        'map origin may not have this run'
    );

  if (uploaded) await verifyOrigin(images, notes);

  const record = {
    record_version: 1,
    published_at: new Date().toISOString(),
    as_of_date: asOf,
    target_date: manifest.target_date,
    lag_days_behind_target: manifest.lag_days_behind_target ?? 0,
    manifest_sha256: manifestDigest,
    manifest_path: manifestRel,
    manifest,
    images,
    origin_uploaded: uploaded,
    // Problems this script hit. They are shown on the page, not swallowed.
    publish_notes: notes,
  };

  fs.mkdirSync(path.join(dataDir, 'runs'), { recursive: true });
  const write = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');

  write(runPath, record);
  write(path.join(dataDir, 'profiles.json'), {
    snapshot_of: 'sandbox/mycomap/species/*.json',
    taken_at: record.published_at,
    profiles,
  });
  write(path.join(dataDir, 'validation.json'), {
    snapshot_of: 'sandbox/mycomap/internal/species/score_bands.json',
    taken_at: record.published_at,
    record: validation,
  });
  // The pointer only ever moves forward. Backfilling an older run with --date
  // adds it to the record without making the site claim it is today's weather.
  const currentPointer = fs.existsSync(latestPath) ? readJson(latestPath) : null;
  if (!currentPointer || asOf >= currentPointer.as_of_date) {
    write(latestPath, {
      as_of_date: asOf,
      target_date: manifest.target_date,
      lag_days_behind_target: record.lag_days_behind_target,
      published_at: record.published_at,
      manifest_sha256: manifestDigest,
      run: `data/weather/runs/${asOf}.json`,
      origin_uploaded: uploaded,
      publishable: true,
    });
  } else {
    console.log(
      `  pointer  : left at ${currentPointer.as_of_date} (this run is older; backfilled only)`
    );
  }

  const totalIn = images.reduce((n, i) => n + (i.source_bytes || 0), 0);
  const totalOut = images.reduce((n, i) => n + (i.published_bytes || 0), 0);
  console.log(`published run as of ${asOf} (map labelled ${manifest.target_date})`);
  console.log(`  species  : ${(manifest.species || []).length}`);
  console.log(
    `  images   : ${images.length} · ${(totalIn / 1048576).toFixed(2)} MB in → ` +
      `${(totalOut / 1048576).toFixed(2)} MB out` +
      (totalOut ? ` (${(totalIn / totalOut).toFixed(2)}×)` : '')
  );
  console.log(`  origin   : ${MAPS_BASE_URL}${uploaded ? ' (uploaded)' : ' (NOT uploaded)'}`);
  for (const n of notes) console.error(`  WARNING  : ${n}`);

  if (DO_COMMIT) {
    console.log(`  branch   : ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`);
    commitData(asOf);
  }
  if (DO_PUSH) {
    git(['push', 'origin', 'HEAD'], { stdio: 'inherit' });
  } else {
    console.log('  (no push — pass --push to publish; --commit to commit only)');
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof Refused) {
      console.error('PUBLISH REFUSED');
      console.error(`  ${err.message}`);
      process.exit(2);
    }
    throw err;
  });
