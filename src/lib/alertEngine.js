import { base44 } from '@/api/base44Client';

const CATEGORY_LABELS = {
  forest: 'Forest',
  wetland: 'Wetland',
  agriculture: 'Agriculture',
  tree_plantation: 'Tree Plantation',
  water_body: 'Water Body',
  wildlife: 'Wildlife',
  environmental_monitoring: 'Environmental Monitoring',
};

// ─── Safeguard helpers ───────────────────────────────────────────────

// Haversine distance in km between two lat/lng points
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if an alert type is satellite-index-based (should be gated by cloud cover)
const INDEX_BASED_TYPES = ['deforestation', 'water_quality'];

/**
 * Compute a seasonal baseline NDVI/NDWI from historical activities
 * near the same location and same season.
 * Returns { ndviBaseline, ndwiBaseline, sampleCount } or null if insufficient data.
 */
function computeSeasonalBaseline(activity, historicalActivities) {
  if (!historicalActivities || historicalActivities.length === 0) return null;

  const now = new Date(activity.monitoring_date || Date.now());
  const month = now.getMonth();

  // Find activities within 5km, same season (±2 months), excluding the current one
  const nearby = historicalActivities.filter((a) => {
    if (a.id === activity.id) return false;
    if (a.latitude == null || a.longitude == null) return false;
    if (activity.latitude == null || activity.longitude == null) return false;
    const dist = distanceKm(activity.latitude, activity.longitude, a.latitude, a.longitude);
    if (dist > 5) return false;
    const aDate = new Date(a.monitoring_date);
    const monthDiff = Math.abs(aDate.getMonth() - month);
    const seasonalDiff = Math.min(monthDiff, 12 - monthDiff);
    return seasonalDiff <= 2;
  });

  const ndviValues = nearby
    .map((a) => a.ndvi)
    .filter((v) => v != null && !isNaN(v) && v > -0.5);
  const ndwiValues = nearby
    .map((a) => a.ndwi)
    .filter((v) => v != null && !isNaN(v) && v > -0.5);

  if (ndviValues.length < 2) return null;

  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

  return {
    ndviBaseline: avg(ndviValues),
    ndwiBaseline: ndwiValues.length >= 2 ? avg(ndwiValues) : null,
    sampleCount: ndviValues.length,
  };
}

// ─── Core evaluation ─────────────────────────────────────────────────

/**
 * Evaluate satellite indicators against safeguards:
 * 1. Cloud-cover gating — skip NDVI/NDWI alerts if cloud > 20%
 * 2. Seasonal baseline — only alert if significantly below the area's normal
 *
 * @param {object} activity - The monitoring activity
 * @param {object} indicators - Satellite-derived indicators
 * @param {array} historicalActivities - Past activities for baseline (optional)
 * @returns {array} alert objects to be created
 */
export function evaluateAlerts(activity, indicators, historicalActivities = []) {
  const alerts = [];
  const { category } = activity;
  const { ndvi, ndwi, fire_risk, flood_risk, temperature_c, humidity_pct, rainfall_mm, cloud_percentage } = indicators;

  // Safeguard 1: Cloud-cover gating for index-based alerts
  const cloudy = cloud_percentage != null && cloud_percentage > 20;
  if (cloudy) {
    console.warn(`[AlertEngine] Skipping NDVI/NDWI alerts — cloud cover ${Math.round(cloud_percentage)}% > 20% threshold`);
  }

  // Safeguard 2: Seasonal baseline
  const baseline = computeSeasonalBaseline(activity, historicalActivities);
  const ndviDropThreshold = 0.15; // Must drop 0.15+ below baseline to alert
  const ndviSevereDropThreshold = 0.25;

  const isNDVIAnomaly = (currentNdvi) => {
    if (!baseline || baseline.ndviBaseline == null) return true; // No baseline → use static thresholds
    const drop = baseline.ndviBaseline - currentNdvi;
    return drop >= ndviDropThreshold;
  };

  const isNDVISevere = (currentNdvi) => {
    if (!baseline || baseline.ndviBaseline == null) return currentNdvi < 0.15;
    const drop = baseline.ndviBaseline - currentNdvi;
    return drop >= ndviSevereDropThreshold;
  };

  // Forest / Tree Plantation: vegetation loss (gated by cloud cover + baseline)
  if (!cloudy && (category === 'forest' || category === 'tree_plantation')) {
    if (ndvi != null && isNDVISevere(ndvi)) {
      alerts.push({
        type: 'deforestation',
        title: 'Vegetation Loss Detected',
        message: `NDVI of ${ndvi.toFixed(2)} at "${activity.activity_name}" indicates severe vegetation loss in ${CATEGORY_LABELS[category]} area.${
          baseline ? ` Normal for this area/season: ${baseline.ndviBaseline.toFixed(2)} (drop of ${(baseline.ndviBaseline - ndvi).toFixed(2)}).` : ''
        } Immediate field investigation recommended.`,
        severity: 'critical',
      });
    } else if (ndvi != null && isNDVIAnomaly(ndvi) && ndvi < 0.35) {
      alerts.push({
        type: 'deforestation',
        title: 'Forest Degradation Detected',
        message: `NDVI of ${ndvi.toFixed(2)} at "${activity.activity_name}" is below the seasonal normal (${baseline ? baseline.ndviBaseline.toFixed(2) : '0.30'}) for ${CATEGORY_LABELS[category]} area.`,
        severity: 'high',
      });
    }
  }

  // Wetland: water loss (gated by cloud cover + baseline)
  if (!cloudy && category === 'wetland') {
    if (ndwi != null) {
      const ndwiBaseline = baseline?.ndwiBaseline;
      const significantDrop = ndwiBaseline != null && (ndwiBaseline - ndwi) >= 0.15;
      if (ndwi < -0.3 && (ndwiBaseline == null || significantDrop)) {
        alerts.push({
          type: 'water_quality',
          title: 'Wetland Degradation Detected',
          message: `NDWI of ${ndwi.toFixed(2)} at "${activity.activity_name}" indicates significant water loss in wetland area.${
            ndwiBaseline != null ? ` Normal: ${ndwiBaseline.toFixed(2)}.` : ''
          } Wetland ecosystem at risk.`,
          severity: ndwi < -0.4 ? 'critical' : 'high',
        });
      }
    }
  }

  // Water Body: shrinkage (gated by cloud cover + baseline)
  if (!cloudy && category === 'water_body') {
    if (ndwi != null) {
      const ndwiBaseline = baseline?.ndwiBaseline;
      const significantDrop = ndwiBaseline != null && (ndwiBaseline - ndwi) >= 0.10;
      if (ndwi < -0.2 && (ndwiBaseline == null || significantDrop)) {
        alerts.push({
          type: 'water_quality',
          title: 'Water Body Shrinkage Detected',
          message: `NDWI of ${ndwi.toFixed(2)} at "${activity.activity_name}" indicates reduced water body extent.`,
          severity: 'medium',
        });
      }
    }
  }

  // Agriculture: crop stress (gated by cloud cover + baseline)
  if (!cloudy && category === 'agriculture') {
    if (ndvi != null && isNDVIAnomaly(ndvi) && ndvi < 0.20) {
      alerts.push({
        type: 'deforestation',
        title: 'Crop Stress Detected',
        message: `NDVI of ${ndvi.toFixed(2)} at "${activity.activity_name}" indicates severe crop stress.${
          baseline ? ` Below seasonal normal of ${baseline.ndviBaseline.toFixed(2)}.` : ''
        } Irrigation or intervention may be needed.`,
        severity: 'high',
      });
    }
  }

  // Fire risk (all categories — not gated by cloud cover, based on weather)
  if (fire_risk === 'critical') {
    alerts.push({
      type: 'fire',
      title: 'Critical Fire Risk Detected',
      message: `Conditions at "${activity.activity_name}": ${temperature_c}°C, ${humidity_pct}% humidity, ${rainfall_mm}mm recent rainfall. Critical fire danger — immediate precaution required.`,
      severity: 'critical',
    });
  } else if (fire_risk === 'high') {
    alerts.push({
      type: 'fire',
      title: 'High Fire Risk Detected',
      message: `Conditions at "${activity.activity_name}": ${temperature_c}°C, ${humidity_pct}% humidity. Elevated fire risk conditions present.`,
      severity: 'high',
    });
  }

  // Flood risk (all categories — not gated by cloud cover, based on rainfall)
  if (flood_risk === 'critical') {
    alerts.push({
      type: 'system',
      title: 'Critical Flood Risk Detected',
      message: `Heavy rainfall (${rainfall_mm}mm) at "${activity.activity_name}". Critical flood risk — immediate evacuation precautions recommended.`,
      severity: 'critical',
    });
  } else if (flood_risk === 'high') {
    alerts.push({
      type: 'system',
      title: 'Flood Risk Detected',
      message: `Significant rainfall (${rainfall_mm}mm) at "${activity.activity_name}". Flood risk conditions present.`,
      severity: 'high',
    });
  }

  return alerts;
}

// ─── Persistence with deduplication ──────────────────────────────────

/**
 * Create alert records in the database, with deduplication:
 * skips creating an alert if an unresolved alert of the same type
 * already exists within 1km in the last 7 days.
 */
export async function createAlerts(activity, alerts) {
  if (!alerts || alerts.length === 0) return [];

  // Safeguard 3: Fetch recent alerts for deduplication
  let recentAlerts = [];
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Fetch alerts created in the last 7 days (filter by is_read=false for unresolved)
    recentAlerts = await base44.entities.Alert.filter({ is_read: false }, '-created_date', 100);
  } catch (e) {
    console.error('[AlertEngine] Failed to fetch recent alerts for dedup:', e);
  }

  // Filter out duplicates
  const isDuplicate = (alert) => {
    return recentAlerts.some((existing) => {
      if (existing.type !== alert.type) return false;
      if (!existing.location?.lat || !existing.location?.lng) return false;
      if (activity.latitude == null || activity.longitude == null) return false;
      const dist = distanceKm(
        activity.latitude,
        activity.longitude,
        existing.location.lat,
        existing.location.lng
      );
      return dist <= 1; // within 1km
    });
  };

  const created = [];
  for (const alert of alerts) {
    if (isDuplicate(alert)) {
      console.log(`[AlertEngine] Skipping duplicate alert: "${alert.title}" — similar alert exists within 1km in last 7 days`);
      continue;
    }
    try {
      const record = await base44.entities.Alert.create({
        title: alert.title,
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        location: {
          lat: activity.latitude,
          lng: activity.longitude,
          region: activity.district || 'Uganda',
        },
        is_read: false,
        data: {
          monitoring_activity_id: activity.id,
          activity_name: activity.activity_name,
          category: activity.category,
          satellite_provider: activity.satellite_provider,
          ndvi: activity.ndvi,
          ndwi: activity.ndwi,
          fire_risk: activity.fire_risk,
          flood_risk: activity.flood_risk,
        },
      });
      created.push(record);
    } catch (e) {
      console.error('Failed to create alert:', e);
    }
  }
  return created;
}

// ─── Admin notifications (conditional) ───────────────────────────────

/**
 * Notify administrators of new monitoring activity —
 * but only if the activity warrants attention (high/critical risk or alert generated).
 * This prevents alert fatigue from low-risk routine activities.
 */
export async function notifyAdminsNewActivity(activity) {
  // Safeguard 4: Only notify for high/critical risk activities
  const highRisk =
    activity.fire_risk === 'high' ||
    activity.fire_risk === 'critical' ||
    activity.flood_risk === 'high' ||
    activity.flood_risk === 'critical' ||
    activity.alert_generated;

  if (!highRisk) {
    return; // Skip admin notification for routine low-risk activities
  }

  try {
    await base44.entities.Alert.create({
      title: 'New High-Risk Monitoring Activity',
      type: 'system',
      message: `Activity: ${activity.activity_name}\nUser: ${activity.user_name || 'Field Officer'}\nCategory: ${CATEGORY_LABELS[activity.category] || activity.category}\nDistrict: ${activity.district || 'Unknown'}\nFire Risk: ${(activity.fire_risk || 'low').toUpperCase()}\nFlood Risk: ${(activity.flood_risk || 'low').toUpperCase()}\nDate: ${new Date(activity.monitoring_date).toLocaleString()}`,
      severity: activity.fire_risk === 'critical' || activity.flood_risk === 'critical' ? 'warning' : 'info',
      location: {
        lat: activity.latitude,
        lng: activity.longitude,
        region: activity.district || 'Uganda',
      },
      is_read: false,
      data: {
        type: 'new_monitoring_activity',
        activity_id: activity.id,
        activity_name: activity.activity_name,
        category: activity.category,
      },
    });
  } catch (e) {
    console.error('Failed to notify admins:', e);
  }
}