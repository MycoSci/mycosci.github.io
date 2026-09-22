#!/usr/bin/env python3
"""Fetch the GBIF distribution spine -> data/gbif-spine.json

This is the input that lets scripts/render-template-pages.mjs say anything about where a
species has been recorded, and — more importantly — lets it refuse to.

WHY IT DOES NOT REUSE data/gbif.json
    build-gbif.mjs accepts a match when `matchType == 'EXACT' OR confidence >= 92`. The
    confidence branch lets a HIGHERRANK match through, and a HIGHERRANK match hands back the
    usageKey of a kingdom or a phylum. That is how 21 records in the shipped catalog ended up
    with registry.gbif = 5 (kingdom Fungi) or 95 (phylum Ascomycota). An occurrence count
    taken from one of those keys is a count of ~28 million records that have nothing to do
    with the species. So this file records matchType and rank explicitly and refuses to
    attach an occurrence count unless BOTH are right.

RULES
    * occurrence_count is set only when matchType == EXACT and rank == SPECIES.
    * A NETWORK FAILURE IS NEVER WRITTEN. A slug whose fetch failed is left out of the output
      so the next run retries it. Caching a failure as a result is a bug this project has
      already shipped once; it is designed against here.
    * Resumable: re-running only fetches slugs that are missing.

Usage:  python3 scripts/fetch-gbif-spine.py [--limit N] [--rps 6] [--all]
        --all covers the whole catalog; the default is the mushroom cut (the slugs Index
        Fungorum enrichment covers) plus the records carrying a known higher-rank key.
"""
import os, sys, json, time, hashlib, threading, queue, urllib.parse, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'gbif-spine.json')
CACHE = os.path.join(ROOT, '.cache', 'gbif-spine')
G = 'https://api.gbif.org/v1'
UA = 'MycoSci/0.2 (+https://mycosci.github.io; open fungal catalog)'
HIGHER_RANK_KEYS = {'5', '34', '95', '186', '316', '273', '149'}

def flag(name, dflt=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else dflt

LIMIT = int(flag('--limit', 0) or 0) or None
RPS = float(flag('--rps', 6))
ALL = '--all' in sys.argv
os.makedirs(CACHE, exist_ok=True)

_lim_lock = threading.Lock()
_last = [0.0]
def throttle():
    with _lim_lock:
        gap = 1.0 / RPS
        wait = gap - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()

STATS = {'http': 0, 'cache': 0, 'err': {}}
_slock = threading.Lock()

def get(url, tries=4):
    """Return parsed JSON, or None on failure. None is NEVER persisted as a result."""
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + '.json')
    if os.path.exists(path):
        with _slock: STATS['cache'] += 1
        try:
            return json.load(open(path))
        except Exception:
            os.remove(path)          # a corrupt cache entry is a failure, not a result
    for attempt in range(tries):
        throttle()
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read()
            with _slock: STATS['http'] += 1
            data = json.loads(raw)
            tmp = f'{path}.{threading.get_ident()}.tmp'
            open(tmp, 'wb').write(raw)
            os.replace(tmp, path)
            return data
        except Exception as exc:
            code = getattr(exc, 'code', type(exc).__name__)
            with _slock:
                k = f'{code}'; STATS['err'][k] = STATS['err'].get(k, 0) + 1
            if attempt < tries - 1:
                time.sleep(2 ** attempt * 2)
    return None

catalog = json.load(open(os.path.join(ROOT, 'data', 'species.json')))
by_slug = {r['slug']: r for r in catalog}
if ALL:
    targets = sorted(by_slug)
else:
    ifr = json.load(open(os.path.join(ROOT, 'data', 'index-fungorum.json')))['records']
    bb = json.load(open(os.path.join(ROOT, 'data', 'backbone-refresh.json')))
    want = set(ifr) | set(bb.get('if_enrichment') or {})
    want |= {s for s, r in by_slug.items()
             if str((r.get('registry') or {}).get('gbif')) in HIGHER_RANK_KEYS}
    targets = sorted(s for s in want if s in by_slug)

done = json.load(open(OUT)) if os.path.exists(OUT) else {}
meta = done.pop('_meta', None)
todo = [s for s in targets if s not in done]
if LIMIT: todo = todo[:LIMIT]
print(f'targets {len(targets)}  cached {len(done)}  to fetch {len(todo)}')

def one(slug):
    name = by_slug[slug]['accepted']
    m = get(f'{G}/species/match?name={urllib.parse.quote(name)}&kingdom=Fungi&strict=true')
    if m is None:
        return None                       # failure -> write nothing
    out = {'scientific_name': name, 'match_type': m.get('matchType'), 'rank': m.get('rank'),
           'usage_key': m.get('usageKey'), 'occurrence_count': None, 'countries': []}
    if m.get('matchType') == 'EXACT' and m.get('rank') == 'SPECIES' and m.get('usageKey'):
        d = get(f"{G}/occurrence/search?taxonKey={m['usageKey']}&limit=0&facet=country&facetLimit=250")
        if d is None:
            return None                   # a partial record is also a failure
        out['occurrence_count'] = d.get('count')
        for f in (d.get('facets') or []):
            if f.get('field') == 'COUNTRY':
                out['countries'] = [c['name'] for c in (f.get('counts') or [])]
    return out

q = queue.Queue()
for s in todo: q.put(s)
lock = threading.Lock(); t0 = time.time(); n = [0]

def save():
    payload = dict(done)
    payload['_meta'] = {
        'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'means': 'when this spine file was last written; individual records may have been '
                 'fetched earlier in the same harvest',
        'rule': 'occurrence_count only when match_type == EXACT and rank == SPECIES'}
    tmp = OUT + '.tmp'
    json.dump(payload, open(tmp, 'w'), ensure_ascii=False, sort_keys=True, indent=0)
    os.replace(tmp, OUT)

def worker():
    while True:
        try: slug = q.get_nowait()
        except queue.Empty: return
        try: r = one(slug)
        except Exception as exc:
            r = None; print(f'  !! {slug}: {type(exc).__name__}: {exc}', flush=True)
        with lock:
            if r is not None: done[slug] = r
            n[0] += 1
            if n[0] % 250 == 0:
                save()
                el = time.time() - t0
                print(f'{n[0]}/{len(todo)} {el:.0f}s {n[0]/el:.1f}/s '
                      f'http={STATS["http"]} cache={STATS["cache"]} err={STATS["err"]}', flush=True)

threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads: t.start()
for t in threads: t.join()
save()
missing = [s for s in targets if s not in done]
print(f'DONE written={len(done)}  failures-left-for-retry={len(missing)}  stats={STATS}')
