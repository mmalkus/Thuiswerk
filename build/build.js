/**
 * Topography data build script for Thuiswerk topografie app.
 *
 * Produces four files in the project root:
 *   topo-nl.json       – NL provinces, cities, rivers
 *   topo-europe.json   – European countries + capitals
 *   topo-world.json    – World countries + capitals
 *   topo-physical.json – European rivers, mountains, seas
 *
 * Data sources:
 *   World countries  – world-atlas@2 npm package (Natural Earth 110m, public domain)
 *   NL provinces     – Natural Earth 10m admin-1, lakes clipped out via polygon-clipping
 *   Everything else  – Natural Earth 50m via Mapbox CDN (public domain)
 *
 * Usage:
 *   cd build && npm install && npm run build
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { feature as topoFeature } from 'topojson-client';
import isoCountries from 'i18n-iso-countries';
import pc from 'polygon-clipping';

const require  = createRequire(import.meta.url);
const __dir    = dirname(fileURLToPath(import.meta.url));
const CACHE    = join(__dir, '.cache');
const OUT      = join(__dir, '..');

isoCountries.registerLocale(require('i18n-iso-countries/langs/nl.json'));
isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'));
const worldAtlas = require('world-atlas/countries-110m.json');

if (!existsSync(CACHE)) mkdirSync(CACHE);

// ── Fetch with local disk cache ───────────────────────────────────────────────

async function fetchCached(url, filename) {
  const p = join(CACHE, filename);
  if (existsSync(p)) {
    process.stdout.write(`  cache  ${filename}\n`);
    return JSON.parse(readFileSync(p, 'utf8'));
  }
  process.stdout.write(`  fetch  ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  writeFileSync(p, JSON.stringify(data));
  return data;
}

function writeOut(name, obj) {
  const p = join(OUT, name);
  const json = JSON.stringify(obj);
  writeFileSync(p, json);
  console.log(`  → ${name}  (${Math.round(json.length / 1024)} KB,  ${obj.features.length} features)`);
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

const r3 = n => Math.round(n * 1e3) / 1e3;

function roundRing(ring)     { return ring.map(([x, y]) => [r3(x), r3(y)]); }
function roundGeometry(g) {
  if (!g) return null;
  switch (g.type) {
    case 'Polygon':      return { type: 'Polygon',      coordinates: g.coordinates.map(roundRing) };
    case 'MultiPolygon': return { type: 'MultiPolygon', coordinates: g.coordinates.map(p => p.map(roundRing)) };
    case 'LineString':   return { type: 'LineString',   coordinates: roundRing(g.coordinates) };
    case 'MultiLineString': return { type: 'MultiLineString', coordinates: g.coordinates.map(roundRing) };
    default: return g;
  }
}

function centroid(g) {
  if (!g) return null;
  let coords;
  if (g.type === 'Polygon') {
    coords = g.coordinates[0];
  } else if (g.type === 'MultiPolygon') {
    coords = g.coordinates.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0];
  } else if (g.type === 'LineString') {
    const mid = g.coordinates[Math.floor(g.coordinates.length / 2)];
    return [r3(mid[0]), r3(mid[1])];
  } else if (g.type === 'MultiLineString') {
    const seg = g.coordinates.reduce((a, b) => a.length >= b.length ? a : b);
    const mid = seg[Math.floor(seg.length / 2)];
    return [r3(mid[0]), r3(mid[1])];
  }
  if (!coords?.length) return null;
  return [
    r3(coords.reduce((s, c) => s + c[0], 0) / coords.length),
    r3(coords.reduce((s, c) => s + c[1], 0) / coords.length),
  ];
}

function coordsOf(g) {
  if (!g) return [];
  if (g.type === 'Polygon')         return g.coordinates[0];
  if (g.type === 'MultiPolygon')    return g.coordinates.flat(2);
  if (g.type === 'LineString')      return g.coordinates;
  if (g.type === 'MultiLineString') return g.coordinates.flat();
  return [];
}

function inBox([minX, minY, maxX, maxY], coords) {
  return coords.some(([x, y]) => x >= minX && x <= maxX && y >= minY && y <= maxY);
}

// ── Polygon clipping helpers ──────────────────────────────────────────────────

function toClipPoly(g) {
  if (g.type === 'Polygon')      return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return null;
}

function fromClipResult(result) {
  if (!result || result.length === 0) return null;
  if (result.length === 1) return { type: 'Polygon', coordinates: result[0] };
  return { type: 'MultiPolygon', coordinates: result };
}

function subtractGeometries(geom, clips) {
  if (!geom || !clips.length) return geom;
  const subject = toClipPoly(geom);
  if (!subject) return geom;
  const clipPolys = clips.map(toClipPoly).filter(Boolean);
  if (!clipPolys.length) return geom;
  try {
    const result = pc.difference(subject, ...clipPolys);
    return fromClipResult(result) || geom;
  } catch {
    return geom;
  }
}

// ── Name tables ───────────────────────────────────────────────────────────────

const namesNl = isoCountries.getNames('nl', { select: 'official' });
const namesEn = isoCountries.getNames('en', { select: 'official' });

// Dutch capital names that differ from English
const CAP_NL = {
  AT: 'Wenen',        BE: 'Brussel',      BY: 'Minsk',
  CZ: 'Praag',        DE: 'Berlijn',      DK: 'Kopenhagen',
  FR: 'Parijs',       GB: 'Londen',       GR: 'Athene',
  HU: 'Boedapest',   IS: 'Reykjavik',    LU: 'Luxemburg',
  PL: 'Warschau',    PT: 'Lissabon',     RO: 'Boekarest',
  RS: 'Belgrado',    RU: 'Moskou',       UA: 'Kyiv',
  // World
  CN: 'Peking',       EG: 'Caïro',        ET: 'Addis Abeba',
  IN: 'New Delhi',    IR: 'Teheran',      JP: 'Tokio',
  MX: 'Mexico-Stad', MA: 'Rabat',        NG: 'Abuja',
  SA: 'Riyad',       ZA: 'Pretoria',
};

// Dutch province names keyed by ISO 3166-2:NL
const NL_PROV = {
  'NL-DR': 'Drenthe',        'NL-FL': 'Flevoland',
  'NL-FR': 'Friesland',      'NL-GE': 'Gelderland',
  'NL-GR': 'Groningen',      'NL-LI': 'Limburg',
  'NL-NB': 'Noord-Brabant',  'NL-NH': 'Noord-Holland',
  'NL-OV': 'Overijssel',     'NL-UT': 'Utrecht',
  'NL-ZE': 'Zeeland',        'NL-ZH': 'Zuid-Holland',
};

// European ISO alpha-2 country codes (including transcontinental states)
const EUROPE_A2 = new Set([
  'AL','AD','AM','AT','AZ','BA','BE','BG','BY','CH','CY','CZ',
  'DE','DK','EE','ES','FI','FR','GB','GE','GR','HR','HU','IE',
  'IS','IT','KZ','LI','LT','LU','LV','MC','MD','ME','MK','MT',
  'NL','NO','PL','PT','RO','RS','RU','SE','SI','SK','SM','TR',
  'UA','VA','XK',
]);

// Dutch names for physical features (Natural Earth English name → Dutch)
const PHYS_NL = {
  // Rivers
  'Rhine':          'Rijn',          'Danube':       'Donau',
  'Loire':          'Loire',         'Rhone':        'Rhône',
  'Elbe':           'Elbe',          'Oder':         'Oder',
  'Vistula':        'Wisła',         'Ebro':         'Ebro',
  'Thames':         'Theems',        'Po':           'Po',
  'Tiber':          'Tiber',         'Dnieper':      'Dnjepr',
  'Meuse':          'Maas',          'Scheldt':      'Schelde',
  'Weser':          'Weser',         'Seine':        'Seine',
  'Garonne':        'Garonne',       'Tagus':        'Taag',
  'Douro':          'Douro',         'Guadalquivir': 'Guadalquivir',
  'Dniester':       'Dnjestr',       'Volga':        'Wolga',
  'Don':            'Don',
  // Extra NL rivers (10m dataset names)
  'Meuse':          'Maas',          'IJssel':       'IJssel',
  'Lek':            'Lek',           'Waal':         'Waal',
  'Vecht':          'Vecht',         'Amstel':       'Amstel',
  'Schelde':        'Schelde',       'Maas':         'Maas',
  'Rijn':           'Rijn',          'Nederrijn':    'Nederrijn',
  // Mountains
  'Alps':                     'Alpen',
  'Pyrenees':                 'Pyreneeën',
  'Carpathians':              'Karpaten',
  'Scandinavian Mountains':   'Scandinavisch gebergte',
  'Apennines':                'Apennijnen',
  'Balkan Mountains':         'Balkangebergte',
  'Caucasus':                 'Kaukasus',
  'Dinaric Alps':             'Dinarische Alpen',
  // Seas
  'North Sea':              'Noordzee',
  'Baltic Sea':             'Baltische Zee',
  'Mediterranean Sea':      'Middellandse Zee',
  'Black Sea':              'Zwarte Zee',
  'Adriatic Sea':           'Adriatische Zee',
  'Aegean Sea':             'Egeïsche Zee',
  'Caspian Sea':            'Kaspische Zee',
  'Norwegian Sea':          'Noorse Zee',
  'Barents Sea':            'Barentszzee',
  'North Atlantic Ocean':   'Atlantische Oceaan',
  'Tyrrhenian Sea':         'Tyrreense Zee',
  'Ionian Sea':             'Ionische Zee',
};

// NL-specific waters (not in Natural Earth marine polys)
const NL_WATERS_NL = {
  'Waddenzee':    'Waddenzee',
  'IJsselmeer':   'IJsselmeer',
  'Markermeer':   'Markermeer',
};

// ── Data source URLs ──────────────────────────────────────────────────────────

// Natural Earth GeoJSON files (nvkelso/natural-earth-vector on GitHub, public domain)
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

// Natural Earth 10m admin-1 (needed — NL provinces absent from 50m scale)
const NE_ADMIN1 = `${NE}/ne_10m_admin_1_states_provinces.geojson`;

// ── Build world + europe ──────────────────────────────────────────────────────

async function buildCountries(placesGeo) {
  console.log('\nBuilding topo-world.json + topo-europe.json...');

  // Capital lookup: alpha-2 → { names, coords }
  const caps = {};
  for (const f of placesGeo.features) {
    const p  = f.properties;
    const fc = (p.FEATURECLA || '').toLowerCase();
    if (!fc.includes('capital')) continue;
    const iso = p.ISO_A2;
    if (!iso || iso === '-99' || iso === '-1') continue;
    const [lon, lat] = f.geometry.coordinates;
    caps[iso] = {
      names:  { nl: CAP_NL[iso] || p.NAME, en: p.NAME },
      coords: [r3(lon), r3(lat)],
    };
  }

  // world-atlas TopoJSON → GeoJSON
  const geo = topoFeature(worldAtlas, worldAtlas.objects.countries);

  const worldFeats = [];
  const euroFeats  = [];

  for (const f of geo.features) {
    const numId = String(f.id).padStart(3, '0');
    const a2    = isoCountries.numericToAlpha2(numId);
    if (!a2) continue;
    const nlName = namesNl[a2];
    const enName = namesEn[a2];
    if (!nlName || !enName) continue;

    const country = {
      id:       a2,
      type:     'country',
      names:    { nl: nlName, en: enName },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(f.geometry),
    };
    if (caps[a2]) country.capital = caps[a2];

    worldFeats.push(country);
    if (caps[a2]) {
      worldFeats.push({
        id:        `${a2}-cap`,
        type:      'capital',
        names:     caps[a2].names,
        coords:    caps[a2].coords,
        countryId: a2,
      });
    }

    if (EUROPE_A2.has(a2)) {
      euroFeats.push(country);
      if (caps[a2]) {
        euroFeats.push({
          id:        `${a2}-cap`,
          type:      'capital',
          names:     caps[a2].names,
          coords:    caps[a2].coords,
          countryId: a2,
        });
      }
    }
  }

  writeOut('topo-world.json', {
    id: 'world', label: { nl: 'Wereld', en: 'World' },
    category: null, contains: ['country', 'capital'],
    features: worldFeats,
  });

  writeOut('topo-europe.json', {
    id: 'europe', label: { nl: 'Europa', en: 'Europe' },
    category: 'world', contains: ['country', 'capital'],
    features: euroFeats,
  });
}

// ── Build NL ──────────────────────────────────────────────────────────────────

const NL_BBOX = [3.3, 50.7, 7.3, 53.6];

// Houtribdijk (N302) divides IJsselmeer (north) from Markermeer (south).
// Endpoints: Enkhuizen → Lelystad
const HOUTRIB_W = [5.292, 52.704];
const HOUTRIB_E = [5.462, 52.514];

// Clip polygons used to split the combined IJsselmeer polygon at the dike.
const CLIP_IJSSELMEER  = [[[3,55],[8,55],[8,HOUTRIB_E[1]],HOUTRIB_E,HOUTRIB_W,[3,HOUTRIB_W[1]],[3,55]]];
const CLIP_MARKERMEER  = [[[3,50],[8,50],[8,HOUTRIB_E[1]],HOUTRIB_E,HOUTRIB_W,[3,HOUTRIB_W[1]],[3,50]]];

function intersectClip(geom, clipPoly) {
  const subject = toClipPoly(geom);
  if (!subject) return null;
  try {
    return fromClipResult(pc.intersection(subject, clipPoly));
  } catch {
    return null;
  }
}

async function buildNL(provGeo, placesGeo, places10mGeo, riversGeo, lakesGeo) {
  console.log('\nBuilding topo-nl.json...');

  const nlLakes = lakesGeo.features.filter(f => inBox(NL_BBOX, coordsOf(f.geometry)));

  // Lakes within NL bbox — used to punch holes in province polygons.
  // Flevoland (NL-FL) is a polder that sits *inside* the IJsselmeer polygon;
  // subtracting would erase it, so we skip it there.
  const nlLakeGeoms = nlLakes.map(f => f.geometry);

  const features = [];

  // ── Inland water bodies (sea type) — rendered first so provinces draw over them ──
  const ijsselFeat = nlLakes.find(f => f.properties.name === 'IJsselmeer');
  if (ijsselFeat) {
    const ijsselGeom    = intersectClip(ijsselFeat.geometry, CLIP_IJSSELMEER);
    const markermeerGeom = intersectClip(ijsselFeat.geometry, CLIP_MARKERMEER);

    if (ijsselGeom) features.push({
      id: 'sea-ijsselmeer', type: 'sea',
      names: { nl: 'IJsselmeer', en: 'IJsselmeer' },
      centroid: centroid(ijsselGeom),
      geometry: roundGeometry(ijsselGeom),
    });
    if (markermeerGeom) features.push({
      id: 'sea-markermeer', type: 'sea',
      names: { nl: 'Markermeer', en: 'Markermeer' },
      centroid: centroid(markermeerGeom),
      geometry: roundGeometry(markermeerGeom),
    });
  }

  const lauwersFeat = nlLakes.find(f => (f.properties.name_nl || f.properties.name) === 'Lauwersmeer'
    || f.properties.name === 'Lauwerszee');
  if (lauwersFeat) features.push({
    id: 'sea-lauwersmeer', type: 'sea',
    names: { nl: 'Lauwersmeer', en: 'Lauwersmeer' },
    centroid: centroid(lauwersFeat.geometry),
    geometry: roundGeometry(lauwersFeat.geometry),
  });

  // Provinces — Natural Earth 10m admin-1 filtered to NL
  for (const f of provGeo.features.filter(f =>
    f.properties.iso_a2 === 'NL' || (f.properties.iso_3166_2 || '').startsWith('NL-')
  )) {
    const p    = f.properties;
    // name_nl is the Dutch name; fall back to English name
    const name = p.name_nl || p.name || p.name_en || '';
    const iso  = p.iso_3166_2 || '';

    // Match by ISO code first, then by Dutch name
    let code = Object.keys(NL_PROV).find(c => c === iso);
    if (!code) code = Object.keys(NL_PROV).find(c => NL_PROV[c].toLowerCase() === name.toLowerCase());
    if (!code) continue;

    // Subtract inland water bodies from province polygons so IJsselmeer/
    // Markermeer/Lauwersmeer render as gaps rather than solid land.
    const geom = code === 'NL-FL'
      ? f.geometry
      : subtractGeometries(f.geometry, nlLakeGeoms);

    features.push({
      id:       code,
      type:     'province',
      names:    { nl: NL_PROV[code], en: NL_PROV[code] },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(geom),
    });
  }

  // Cities — use 10m populated places for better NL coverage, top 25 by scalerank
  places10mGeo.features
    .filter(f => f.properties.ISO_A2 === 'NL')
    .sort((a, b) => (a.properties.SCALERANK ?? 10) - (b.properties.SCALERANK ?? 10))
    .slice(0, 25)
    .forEach(f => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      const nlName = p.NAME_NL || p.name_nl || p.NAME;
      features.push({
        id:     `city-${p.NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        type:   'city',
        names:  { nl: nlName, en: p.NAME },
        coords: [r3(lon), r3(lat)],
      });
    });

  // Rivers that pass through the Netherlands
  const seen = new Set();
  for (const f of riversGeo.features) {
    const p    = f.properties;
    const name = p.name || p.NAME || '';
    if (!name || seen.has(name)) continue;
    const fc = (p.featurecla || p.FEATURECLA || '').toLowerCase();
    if (fc.includes('lake')) continue; // skip lake centerlines

    if (!inBox(NL_BBOX, coordsOf(f.geometry))) continue;

    seen.add(name);
    features.push({
      id:       `river-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type:     'river',
      names:    { nl: PHYS_NL[name] || name, en: name },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(f.geometry),
    });
  }

  writeOut('topo-nl.json', {
    id: 'nl', label: { nl: 'Nederland', en: 'Netherlands' },
    category: 'europe', contains: ['province', 'city', 'river', 'sea'],
    features,
  });
}

// ── Build physical geography ──────────────────────────────────────────────────

const EU_BBOX = [-12, 33, 50, 72];

// Major European rivers for physical geography (50m dataset 'name' field)
const RIVER_WHITELIST = new Set([
  'Rhine', 'Danube', 'Loire', 'Rhone', 'Elbe', 'Oder', 'Vistula',
  'Ebro', 'Thames', 'Po', 'Tiber', 'Dnieper', 'Meuse', 'Weser',
  'Seine', 'Garonne', 'Tagus', 'Douro', 'Guadalquivir', 'Dniester',
  'Volga', 'Don',
]);

// Mountain ranges relevant to Dutch school curriculum (by Natural Earth NAME field)
const MTN_WHITELIST = new Set([
  'ALPS', 'PYRENEES', 'CARPATHIAN MOUNTAINS', 'KJØLEN MOUNTAINS',
  'CAUCASUS MTS.', 'Balkan Mts.', 'Dinaric Alps', 'APPENNINI',
  'Lesser Caucasus', 'Cord. Cantábrica',
]);

async function buildPhysical(riversGeo, regionGeo, marineGeo) {
  console.log('\nBuilding topo-physical.json...');

  const features = [];
  const seen     = new Set();

  // Rivers — 50m dataset uses lowercase 'name', no native NL field → use PHYS_NL lookup
  for (const f of riversGeo.features) {
    const p    = f.properties;
    const name = p.name || '';              // 50m rivers use lowercase 'name'
    const nlName = PHYS_NL[name];
    if (!name || seen.has(name) || !nlName || !RIVER_WHITELIST.has(name)) continue;
    const fc = (p.featurecla || '').toLowerCase();
    if (fc.includes('lake')) continue;
    if (!inBox(EU_BBOX, coordsOf(f.geometry))) continue;

    seen.add(name);
    features.push({
      id:       `river-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type:     'river',
      names:    { nl: nlName, en: p.name_en || name },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(f.geometry),
    });
  }

  // Mountains — regions dataset uses uppercase 'NAME' and has 'NAME_NL' built-in
  for (const f of regionGeo.features) {
    const p    = f.properties;
    const name = p.NAME || '';
    if (!MTN_WHITELIST.has(name)) continue;
    if (p.FEATURECLA !== 'Range/mtn') continue;
    if (!inBox(EU_BBOX, coordsOf(f.geometry))) continue;

    const nlName = p.NAME_NL || PHYS_NL[p.NAME_EN || name] || name;
    const enName = p.NAME_EN || name;
    features.push({
      id:       `mount-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type:     'mountain',
      names:    { nl: nlName, en: enName },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(f.geometry),
    });
  }

  // Seas — marine dataset uses lowercase 'name' and 'name_nl'
  for (const f of marineGeo.features) {
    const p      = f.properties;
    const name   = p.name || '';
    const nlName = p.name_nl || PHYS_NL[name];
    if (!name || !nlName) continue;
    if (!inBox(EU_BBOX, coordsOf(f.geometry))) continue;

    features.push({
      id:       `sea-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type:     'sea',
      names:    { nl: nlName, en: p.name_en || name },
      centroid: centroid(f.geometry),
      geometry: roundGeometry(f.geometry),
    });
  }

  writeOut('topo-physical.json', {
    id: 'physical', label: { nl: 'Fysische geografie', en: 'Physical geography' },
    category: 'europe', contains: ['river', 'mountain', 'sea'],
    features,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching source data...');
  const [placesGeo, places10mGeo, provGeo, rivers50mGeo, rivers10mGeo, regionGeo, marineGeo, lakesGeo] = await Promise.all([
    fetchCached(`${NE}/ne_50m_populated_places.geojson`,          'ne_50m_populated_places.geojson'),
    fetchCached(`${NE}/ne_10m_populated_places.geojson`,          'ne_10m_populated_places.geojson'),
    fetchCached(NE_ADMIN1,                                         'ne_10m_admin1.geojson'),
    fetchCached(`${NE}/ne_50m_rivers_lake_centerlines.geojson`,   'ne_50m_rivers.geojson'),
    fetchCached(`${NE}/ne_10m_rivers_lake_centerlines.geojson`,   'ne_10m_rivers.geojson'),
    fetchCached(`${NE}/ne_50m_geography_regions_polys.geojson`,   'ne_50m_regions.geojson'),
    fetchCached(`${NE}/ne_50m_geography_marine_polys.geojson`,    'ne_50m_marine.geojson'),
    fetchCached(`${NE}/ne_10m_lakes.geojson`,                     'ne_10m_lakes.geojson'),
  ]);

  console.log('\nBuilding output files...');
  await buildCountries(placesGeo);
  await buildNL(provGeo, placesGeo, places10mGeo, rivers10mGeo, lakesGeo);
  await buildPhysical(rivers50mGeo, regionGeo, marineGeo);

  console.log('\nDone. Run `cd .. && git status` to review new files.');
}

main().catch(err => { console.error(err); process.exit(1); });
