import { base44 } from '@/api/base44Client';
import { sampleAllGibsLayers } from '@/lib/gibsSampler';

/**
 * Fetch weather data from Open-Meteo API (no auth, CORS-friendly, satellite-derived).
 * Provides temperature, humidity, rainfall, cloud cover.
 */
export async function fetchWeatherData(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m&daily=precipitation_sum&past_days=3`;
  const res = await fetch(url);
  const data = await res.json();
  const recentRainfall = (data.daily?.precipitation_sum || []).reduce((a, b) => a + (b || 0), 0);
  return {
    temperature_c: data.current?.temperature_2m ?? null,
    humidity_pct: data.current?.relative_humidity_2m ?? null,
    rainfall_mm: recentRainfall,
    current_rain: data.current?.precipitation ?? 0,
    cloud_pct: data.current?.cloud_cover ?? null,
    wind_speed: data.current?.wind_speed_10m ?? null,
  };
}

/**
 * Find nearest stored Copernicus Sentinel-2 SatelliteScene by bounding box center.
 * Returns real NDVI/NDWI data from the closest monitoring site.
 */
export async function fetchNearestSatelliteScene(lat, lng) {
  try {
    const scenes = await base44.entities.SatelliteScene.list('-fetched_at', 20);
    if (scenes.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;
    for (const scene of scenes) {
      if (!scene.bbox || scene.bbox.length !== 4) continue;
      const sceneLat = (scene.bbox[1] + scene.bbox[3]) / 2;
      const sceneLng = (scene.bbox[0] + scene.bbox[2]) / 2;
      const dist = (sceneLat - lat) ** 2 + (sceneLng - lng) ** 2;
      if (dist < minDist) { minDist = dist; nearest = scene; }
    }
    return nearest;
  } catch (e) {
    console.error('Failed to fetch satellite scenes:', e);
    return null;
  }
}

/**
 * Derive environmental indicators from satellite + weather data.
 * No AI is used — all values come directly from satellite services.
 * Priority: GIBS pixel sample (real) > stored Copernicus scene > Open-Meteo.
 */
export function deriveIndicators(weather, satScene, category, gibsSample) {
  // Use GIBS pixel sample first (real data from what user sees on map),
  // fall back to stored Copernicus scene, then null
  const ndvi = gibsSample?.ndvi ?? satScene?.ndvi_mean ?? null;
  const ndwi = gibsSample?.ndwi ?? satScene?.ndwi_mean ?? null;
  const temp = gibsSample?.surface_temp_c ?? weather?.temperature_c ?? null;
  const humidity = weather?.humidity_pct ?? null;
  const rainfall = weather?.rainfall_mm ?? 0;
  const cloud = weather?.cloud_pct ?? satScene?.cloud_cover_pct ?? null;
  const waterDetected = gibsSample?.water_detected ?? false;

  // Vegetation status from NDVI
  let vegetationStatus = 'unknown';
  if (ndvi != null) {
    if (ndvi > 0.5) vegetationStatus = 'healthy';
    else if (ndvi > 0.3) vegetationStatus = 'moderate';
    else if (ndvi > 0.1) vegetationStatus = 'degraded';
    else vegetationStatus = 'barren';
  }

  // Water presence from NDWI or GIBS flood detection
  const waterPresence = waterDetected || (ndwi != null ? ndwi > 0.2 : false);

  // Flood risk using rainfall intensity and water saturation index
  // Flood Potential = (rainfall_mm / 10) × (1 + waterSaturation × 2)
  // waterSaturation = max(0, NDWI) or 0.3 if water detected by satellite
  // Classification: <1 Low, 1-2 Medium, 2-3 High, 3+ Critical
  let floodRisk = 'low';
  if (rainfall != null) {
    const waterSaturation = ndwi != null ? Math.max(0, ndwi) : (waterDetected ? 0.3 : 0);
    const floodIndex = (rainfall / 10) * (1 + waterSaturation * 2);
    if (floodIndex >= 3) floodRisk = 'critical';
    else if (floodIndex >= 2) floodRisk = 'high';
    else if (floodIndex >= 1) floodRisk = 'medium';
  }

  // Fire risk using McArthur Mark 5 Forest Fire Danger Index (FFDI)
  // FFDI = 2 × exp(-0.45 + 0.987 × ln(DF) - 0.0345 × RH + 0.0338 × T)
  // DF = drought factor (1-10), RH = relative humidity (%), T = temperature (°C)
  // Classification: <12 Low, 12-25 High, 25-50 Extreme, 50+ Catastrophic
  let fireRisk = 'low';
  if (temp != null && humidity != null) {
    const droughtFactor = Math.max(1, Math.min(10, 10 - (rainfall || 0)));
    const ffdi = 2 * Math.exp(-0.45 + 0.987 * Math.log(droughtFactor) - 0.0345 * humidity + 0.0338 * temp);
    if (ffdi >= 50) fireRisk = 'critical';
    else if (ffdi >= 25) fireRisk = 'high';
    else if (ffdi >= 12) fireRisk = 'medium';
    // Elevated fire risk if vegetation is dry (low NDVI = low fuel moisture)
    if (ndvi != null && ndvi < 0.2 && ffdi >= 5) {
      if (fireRisk === 'low') fireRisk = 'medium';
      else if (fireRisk === 'medium') fireRisk = 'high';
    }
  }

  // Land cover estimation
  let landCover = 'unknown';
  if (ndvi != null) {
    if (category === 'water_body' || (ndwi != null && ndwi > 0.3)) landCover = 'Water Body';
    else if (ndvi > 0.6) landCover = 'Dense Forest';
    else if (ndvi > 0.4) landCover = 'Moderate Vegetation';
    else if (ndvi > 0.2) landCover = 'Sparse Vegetation / Grassland';
    else landCover = 'Bare Ground';
  }

  // Determine data source provenance
  const hasGibs = gibsSample && (gibsSample.ndvi != null || gibsSample.surface_temp_c != null);
  const providers = [];
  if (hasGibs) providers.push('NASA GIBS');
  if (satScene) providers.push('Copernicus Sentinel-2');
  providers.push('Open-Meteo');

  return {
    ndvi,
    ndwi,
    vegetation_status: vegetationStatus,
    water_presence: waterPresence,
    water_detected: waterDetected,
    flood_risk: floodRisk,
    fire_risk: fireRisk,
    rainfall_mm: rainfall,
    temperature_c: temp,
    surface_temp_c: gibsSample?.surface_temp_c ?? null,
    humidity_pct: humidity,
    cloud_percentage: cloud,
    land_cover: landCover,
    satellite_provider: providers.join(' + '),
    satellite_name: hasGibs ? 'MODIS Terra (GIBS) + Sentinel-2' : (satScene ? 'Sentinel-2 L2A' : 'Open-Meteo Weather Sat'),
    acquisition_date: satScene?.acquisition_date ?? new Date().toISOString(),
    processing_date: new Date().toISOString(),
    spatial_resolution_m: hasGibs ? 250 : (satScene ? 10 : 1000),
    cloud_cover_pct: cloud,
    gibs_sources: gibsSample?.gibs_sources || [],
  };
}

/**
 * Fetch all satellite data for a monitoring activity.
 * Combines NASA GIBS pixel samples (real NDVI/NDWI/temp from map tiles),
 * Copernicus stored scenes, and Open-Meteo weather data.
 * @param {number} lat
 * @param {number} lng
 * @param {string} category
 * @param {string} mapDate - YYYY-MM-DD date for GIBS sampling
 */
export async function fetchSatelliteData(lat, lng, category, mapDate) {
  const date = mapDate || new Date().toISOString().slice(0, 10);
  const [weather, satScene, gibsSample] = await Promise.all([
    fetchWeatherData(lat, lng),
    fetchNearestSatelliteScene(lat, lng),
    sampleAllGibsLayers(lat, lng, date),
  ]);
  const indicators = deriveIndicators(weather, satScene, category, gibsSample);
  return { weather, satScene, gibsSample, indicators };
}