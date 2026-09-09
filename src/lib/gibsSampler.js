/**
 * GIBS Tile Pixel Sampler
 * Samples actual NASA GIBS tile pixels at a given coordinate to derive
 * real satellite indicator values (NDVI, NDWI, surface temperature, water presence).
 * Values match what the user sees on the map overlay.
 */

const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

// Layer configurations: { id, layer, tms, format, maxZoom }
const LAYER_CFG = {
  ndvi:           { layer: 'MODIS_Terra_NDVI_8Day',                  tms: 'GoogleMapsCompatible_Level9', fmt: 'png', maxZoom: 9 },
  flood:          { layer: 'MODIS_Combined_Flood_3-Day',              tms: 'GoogleMapsCompatible_Level9', fmt: 'png', maxZoom: 9 },
  ndwi:           { layer: 'MODIS_Combined_Flood_3-Day',              tms: 'GoogleMapsCompatible_Level9', fmt: 'png', maxZoom: 9 },
  temperature:    { layer: 'MODIS_Terra_Land_Surface_Temp_Day',       tms: 'GoogleMapsCompatible_Level7', fmt: 'png', maxZoom: 7 },
  fire:           { layer: 'MODIS_Terra_CorrectedReflectance_Bands721', tms: 'GoogleMapsCompatible_Level9', fmt: 'jpg', maxZoom: 9 },
};

// ── Coordinate → Tile conversion (Web Mercator / Google tiling) ──
function lon2tile(lon, zoom) { return (lon + 180) / 360 * Math.pow(2, zoom); }
function lat2tile(lat, zoom) {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom);
}

function loadTileImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Tile load failed'));
    img.src = url;
  });
}

function readPixel(img, px, py) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(px, py, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] };
}

// ── NDVI color ramp (GIBS MODIS_Terra_NDVI_8Day palette) ──
// Maps RGB → NDVI value by finding nearest ramp entry
const NDVI_RAMP = [
  { v: -0.3,  rgb: [0, 0, 80] },
  { v: -0.2,  rgb: [0, 50, 130] },
  { v: -0.1,  rgb: [70, 100, 180] },
  { v:  0.0,  rgb: [130, 65, 0] },
  { v:  0.1,  rgb: [255, 255, 0] },
  { v:  0.2,  rgb: [200, 230, 50] },
  { v:  0.3,  rgb: [170, 220, 50] },
  { v:  0.4,  rgb: [130, 200, 40] },
  { v:  0.5,  rgb: [100, 180, 50] },
  { v:  0.6,  rgb: [80, 160, 40] },
  { v:  0.7,  rgb: [50, 140, 30] },
  { v:  0.8,  rgb: [30, 110, 20] },
  { v:  0.9,  rgb: [20, 90, 15] },
  { v:  1.0,  rgb: [10, 60, 10] },
];

function nearestValue(ramp, r, g, b) {
  let best = ramp[0];
  let minDist = Infinity;
  for (const e of ramp) {
    const d = (e.rgb[0] - r) ** 2 + (e.rgb[1] - g) ** 2 + (e.rgb[2] - b) ** 2;
    if (d < minDist) { minDist = d; best = e; }
  }
  return best.v;
}

// ── Land Surface Temperature ramp (MODIS_Terra_Land_Surface_Temp_Day) ──
const LST_RAMP = [
  { v: -10, rgb: [20, 0, 120] },
  { v:   0, rgb: [40, 60, 180] },
  { v:  10, rgb: [60, 150, 200] },
  { v:  20, rgb: [80, 200, 100] },
  { v:  25, rgb: [200, 220, 60] },
  { v:  30, rgb: [240, 200, 40] },
  { v:  35, rgb: [240, 140, 30] },
  { v:  40, rgb: [240, 80, 20] },
  { v:  45, rgb: [220, 20, 10] },
  { v:  50, rgb: [180, 0, 0] },
];

/**
 * Sample a GIBS layer at a coordinate.
 * Returns real values derived from the actual satellite tile pixel.
 */
export async function sampleGibsLayer(lat, lng, layerType, date) {
  const cfg = LAYER_CFG[layerType];
  if (!cfg) return null;

  const zoom = cfg.maxZoom;
  const xTile = lon2tile(lng, zoom);
  const yTile = lat2tile(lat, zoom);
  const tileX = Math.floor(xTile);
  const tileY = Math.floor(yTile);
  const px = Math.max(0, Math.min(255, Math.floor((xTile - tileX) * 256)));
  const py = Math.max(0, Math.min(255, Math.floor((yTile - tileY) * 256)));

  // For JPG layers (fire false-color), there's no alpha — use the pixel as-is
  // For PNG layers, alpha=0 means no data for that date/location
  const url = `${GIBS_BASE}/${cfg.layer}/default/${date}/${cfg.tms}/${zoom}/${tileY}/${tileX}.${cfg.fmt}`;

  try {
    const img = await loadTileImage(url);
    const pixel = readPixel(img, px, py);

    // Transparent pixel = no data
    if (cfg.fmt === 'png' && pixel.a < 30) {
      return { rgb: pixel, noData: true, source: 'NASA GIBS' };
    }

    if (layerType === 'ndvi') {
      return { ndvi: nearestValue(NDVI_RAMP, pixel.r, pixel.g, pixel.b), rgb: pixel, source: 'NASA GIBS / MODIS Terra NDVI 8-Day' };
    }
    if (layerType === 'ndwi' || layerType === 'flood') {
      // Flood layer: blue pixels = water, transparent = land
      const isWater = pixel.a > 30 && pixel.b > 80 && pixel.b > pixel.r + 20;
      // NDWI approximation from flood detection: water → high NDWI
      const ndwi = isWater ? 0.1 + (pixel.b - pixel.r) / 255 * 0.4 : -0.2;
      return { ndwi, water_detected: isWater, rgb: pixel, source: 'NASA GIBS / MODIS Flood 3-Day' };
    }
    if (layerType === 'temperature') {
      return { surface_temp_c: nearestValue(LST_RAMP, pixel.r, pixel.g, pixel.b), rgb: pixel, source: 'NASA GIBS / MODIS Land Surface Temp' };
    }
    if (layerType === 'fire') {
      // False-color B7-2-1: active fires appear as bright red/pink spots, burn scars dark
      const isFireHotspot = pixel.r > 200 && pixel.g < 100 && pixel.b < 100;
      return { fire_detected: isFireHotspot, rgb: pixel, source: 'NASA GIBS / MODIS False-Color Fire' };
    }
    return { rgb: pixel, source: 'NASA GIBS' };
  } catch (e) {
    console.warn(`GIBS sample failed for ${layerType}:`, e.message);
    return null;
  }
}

/**
 * Sample all relevant GIBS layers at a coordinate to get complete real data.
 * Always samples NDVI, flood/water, and temperature for full risk assessment.
 */
export async function sampleAllGibsLayers(lat, lng, date) {
  const [ndviRes, floodRes, tempRes] = await Promise.all([
    sampleGibsLayer(lat, lng, 'ndvi', date),
    sampleGibsLayer(lat, lng, 'flood', date),
    sampleGibsLayer(lat, lng, 'temperature', date),
  ]);

  return {
    ndvi: ndviRes?.noData ? null : (ndviRes?.ndvi ?? null),
    ndwi: floodRes?.noData ? null : (floodRes?.ndwi ?? null),
    water_detected: floodRes?.water_detected ?? false,
    surface_temp_c: tempRes?.noData ? null : (tempRes?.surface_temp_c ?? null),
    fire_detected: false, // fire sampled separately if fire layer active
    gibs_sources: [ndviRes?.source, floodRes?.source, tempRes?.source].filter(Boolean),
  };
}