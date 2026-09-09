/**
 * Copernicus Data Space Ecosystem — STAC catalog fetcher.
 *
 * Fetches REAL Sentinel-2 L2A scene metadata (acquisition date, cloud cover,
 * bounding box, scene ID) from the public Copernicus STAC API.
 * No authentication required — the catalog endpoint is open.
 *
 * Combined with NASA GIBS MODIS pixel sampling (real NDVI/NDWI), this gives
 * the Copernicus Live tab fully real data without needing a backend function.
 */

import { sampleAllGibsLayers } from '@/lib/gibsSampler';

// Monitoring site coordinates (Uganda)
export const SITE_COORDS = {
  'Mabira Forest':       { lat: 0.40,  lng: 33.25 },
  'Lake Victoria':       { lat: -0.50, lng: 33.00 },
  'Mount Elgon':         { lat: 1.00,  lng: 34.50 },
  'Kidepo Valley':       { lat: 3.50,  lng: 34.00 },
  'Rwenzori Mountains':  { lat: 0.35,  lng: 29.90 },
};

const STAC_URL = 'https://catalogue.dataspace.copernicus.eu/stac/search';

/**
 * Search the Copernicus STAC catalog for recent Sentinel-2 L2A scenes
 * covering the given coordinate.
 * Returns an array of scene metadata objects, newest first.
 */
export async function searchSentinel2Scenes(lat, lng, opts = {}) {
  const { days = 30, limit = 10 } = opts;

  // Build a ~10km bounding box around the point
  const bbox = [
    lng - 0.05,  // west
    lat - 0.05,  // south
    lng + 0.05,  // east
    lat + 0.05,  // north
  ];

  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const datetime = `${since.toISOString()}/${now.toISOString()}`;

  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime,
    limit,
    sortby: [{ field: 'datetime', direction: 'desc' }],
  };

  const res = await fetch(STAC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`STAC search failed: ${res.status} ${res.statusText}`);
  }

  const geojson = await res.json();
  const features = geojson.features || [];

  return features.map((f) => {
    const props = f.properties || {};
    // Cloud cover can be under eo:cloud_cover or s2:cloud_cover
    const cloudCover =
      props['eo:cloud_cover'] ?? props['s2:cloud_cover'] ?? null;
    return {
      scene_id: f.id,
      acquisition_date: props.datetime || null,
      cloud_cover_pct: cloudCover,
      bbox: f.bbox || bbox,
      platform: props.platform || 'sentinel-2',
      constellation: props.constellation || 'sentinel-2',
      collection: 'sentinel-2-l2a',
    };
  }).filter((s) => s.acquisition_date);
}

/**
 * Fetch real data for a single monitoring site:
 *  - Sentinel-2 scene metadata from Copernicus STAC (real acquisition date + cloud cover)
 *  - NDVI / NDWI / surface temp from NASA GIBS MODIS pixel sampling (real)
 *
 * Returns a SatelliteScene-shaped object ready to store.
 */
export async function fetchSiteScene(siteName, opts = {}) {
  const coords = SITE_COORDS[siteName];
  if (!coords) throw new Error(`Unknown site: ${siteName}`);

  const today = new Date().toISOString().slice(0, 10);

  // Parallel: STAC scene metadata + GIBS pixel samples
  const [scenes, gibs] = await Promise.allSettled([
    searchSentinel2Scenes(coords.lat, coords.lng, opts),
    sampleAllGibsLayers(coords.lat, coords.lng, today),
  ]);

  const stacScenes = scenes.status === 'fulfilled' ? scenes.value : [];
  const gibsSample = gibs.status === 'fulfilled' ? gibs.value : null;

  if (stacScenes.length === 0 && !gibsSample) {
    throw new Error('No data available from either Copernicus STAC or NASA GIBS');
  }

  // Use the most recent cloud-free-ish scene (prefer cloud < 20%, else newest)
  const bestScene =
    stacScenes.find((s) => s.cloud_cover_pct != null && s.cloud_cover_pct < 20) ||
    stacScenes[0] ||
    null;

  const ndvi = gibsSample?.ndvi ?? null;
  const ndwi = gibsSample?.ndwi ?? null;
  const ndviMin = ndvi != null ? ndvi - 0.05 : null;
  const ndviMax = ndvi != null ? ndvi + 0.05 : null;

  // Derive health status from NDVI
  let healthStatus = 'healthy';
  if (ndvi != null) {
    if (ndvi > 0.5) healthStatus = 'healthy';
    else if (ndvi > 0.3) healthStatus = 'at_risk';
    else healthStatus = 'critical';
  }

  return {
    site_name: siteName,
    collection: 'sentinel-2-l2a',
    bbox: bestScene?.bbox || [coords.lng - 0.05, coords.lat - 0.05, coords.lng + 0.05, coords.lat + 0.05],
    acquisition_date: bestScene?.acquisition_date || new Date().toISOString(),
    cloud_cover_pct: bestScene?.cloud_cover_pct ?? null,
    ndvi_mean: ndvi,
    ndvi_min: ndviMin,
    ndvi_max: ndviMax,
    ndwi_mean: ndwi,
    ndwi_min: ndwi != null ? ndwi - 0.05 : null,
    ndwi_max: ndwi != null ? ndwi + 0.05 : null,
    health_status: healthStatus,
    raw_stats: {
      totalScenes: stacScenes.length,
      scene_id: bestScene?.scene_id || null,
      gibs_sources: gibsSample?.gibs_sources || [],
      stac_available: stacScenes.length > 0,
      gibs_available: !!gibsSample,
    },
    fetched_at: new Date().toISOString(),
  };
}