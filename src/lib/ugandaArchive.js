/**
 * Uganda Environmental Data Bank — Archive Fetcher
 *
 * Fetches 6 months of real satellite + weather data for every Uganda site:
 *  - Copernicus STAC: real Sentinel-2 scene metadata (dates, cloud cover, scene IDs)
 *  - NASA GIBS MODIS: real NDVI, NDWI, surface temperature pixel samples (monthly snapshots)
 *  - Open-Meteo Archive API: real daily rainfall, temperature, humidity for the full 6-month range
 *
 * Data is APPENDED on each refresh — never deleted — building a growing data bank.
 * Each site gets monthly satellite snapshots + daily weather → detailed from day 1 to today.
 */

import { UGANDA_SITES } from '@/lib/ugandaSites';
import { searchSentinel2Scenes } from '@/lib/copernicusStac';
import { sampleAllGibsLayers } from '@/lib/gibsSampler';

/**
 * Fetch daily historical weather from Open-Meteo Archive API for a date range.
 * Returns a map of { 'YYYY-MM-DD': { temperature_c, humidity_pct, rainfall_mm } }.
 */
async function fetchOpenMeteoHistory(lat, lng, startDate, endDate) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max` +
    `&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  const daily = data.daily;
  if (!daily || !daily.time) return {};

  const map = {};
  for (let i = 0; i < daily.time.length; i++) {
    map[daily.time[i]] = {
      temperature_c: daily.temperature_2m_max?.[i] ?? null,
      humidity_pct: daily.relative_humidity_2m_max?.[i] ?? null,
      rainfall_mm: daily.precipitation_sum?.[i] ?? null,
    };
  }
  return map;
}

/**
 * Generate monthly sample dates (15th of each month) going back N months.
 */
function generateMonthlyDates(months) {
  const now = new Date();
  const dates = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Find the nearest STAC scene to a given date.
 */
function findNearestScene(scenes, targetDate) {
  if (!scenes || scenes.length === 0) return null;
  const target = new Date(targetDate).getTime();
  let nearest = null;
  let minDiff = Infinity;
  for (const s of scenes) {
    if (!s.acquisition_date) continue;
    const diff = Math.abs(new Date(s.acquisition_date).getTime() - target);
    if (diff < minDiff) { minDiff = diff; nearest = s; }
  }
  return nearest;
}

function deriveHealthStatus(ndvi) {
  if (ndvi == null) return 'healthy';
  if (ndvi > 0.5) return 'healthy';
  if (ndvi > 0.3) return 'at_risk';
  return 'critical';
}

/**
 * Fetch archive records for a single site over 6 months.
 * Returns an array of UgandaEnvArchive-shaped records (monthly satellite snapshots
 * enriched with daily weather from Open-Meteo for the same date).
 */
export async function fetchSiteArchive(site, batchId, opts = {}) {
  const { months = 6 } = opts;
  const days = months * 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  const sampleDates = generateMonthlyDates(months);

  // Parallel: STAC scenes + Open-Meteo daily history + GIBS samples for each date
  const [stacScenes, weatherMap, ...gibsResults] = await Promise.all([
    searchSentinel2Scenes(site.lat, site.lng, { days, limit: 20 }).catch(() => []),
    fetchOpenMeteoHistory(site.lat, site.lng, startDate, endDate).catch(() => ({})),
    ...sampleDates.map((date) => sampleAllGibsLayers(site.lat, site.lng, date).catch(() => null)),
  ]);

  // Build one record per monthly satellite sample date
  return sampleDates.map((date, i) => {
    const gibs = gibsResults[i] || null;
    const weather = weatherMap[date] || {};
    const nearestScene = findNearestScene(stacScenes, date);
    const ndvi = gibs?.ndvi ?? null;
    const ndwi = gibs?.ndwi ?? null;

    return {
      site_name: site.name,
      feature_type: site.type,
      water_classification: site.water_classification || 'none',
      region: site.region,
      latitude: site.lat,
      longitude: site.lng,
      acquisition_date: new Date(date).toISOString(),
      cloud_cover_pct: nearestScene?.cloud_cover_pct ?? null,
      ndvi,
      ndwi,
      surface_temp_c: gibs?.surface_temp_c ?? null,
      water_detected: gibs?.water_detected ?? false,
      rainfall_mm: weather.rainfall_mm ?? null,
      temperature_c: weather.temperature_c ?? null,
      humidity_pct: weather.humidity_pct ?? null,
      health_status: deriveHealthStatus(ndvi),
      scene_id: nearestScene?.scene_id || null,
      batch_id: batchId,
      fetched_at: new Date().toISOString(),
    };
  });
}

/**
 * Fetch archive data for ALL Uganda sites.
 * Processes sites in parallel batches to balance speed and browser limits.
 *
 * @param {function} onProgress — called with (sitesDone, totalSites, recordsSoFar)
 * @returns {Promise<{batchId, records}>}
 */
export async function fetchUgandaDataBank(onProgress, opts = {}) {
  const batchId = `archive_${Date.now()}`;
  const { concurrency = 5 } = opts;
  const allRecords = [];
  const totalSites = UGANDA_SITES.length;

  for (let i = 0; i < totalSites; i += concurrency) {
    const batch = UGANDA_SITES.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((site) => fetchSiteArchive(site, batchId, opts))
    );
    for (const records of results) {
      allRecords.push(...records);
    }
    if (onProgress) {
      onProgress(Math.min(i + concurrency, totalSites), totalSites, allRecords.length);
    }
  }

  return { batchId, records: allRecords };
}