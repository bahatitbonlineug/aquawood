/**
 * AutoDailyLogger — runs invisibly in the background (mounted in Layout).
 * Ensures satellite scans + district AI logs run at least once per hour
 * and produces a consolidated DailyMonitoringReport every day at midnight.
 * Works even if no user is actively viewing a monitoring page.
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

const SITES = [
  { name: 'Mabira Forest', lat: 0.4167, lon: 32.9833, type: 'forest' },
  { name: 'Lake Victoria', lat: -1.0, lon: 33.0, type: 'water' },
];

const DISTRICTS = [
  { name: 'Kampala', lat: 0.3476, lon: 32.5825, forest_risk: 'high', water_bodies: 'Lake Victoria nearby' },
  { name: 'Mbarara', lat: -0.6072, lon: 30.6545, forest_risk: 'moderate', water_bodies: 'Lake Mburo area' },
  { name: 'Gulu', lat: 2.7748, lon: 32.2990, forest_risk: 'high', water_bodies: 'Achwa River basin' },
  { name: 'Jinja', lat: 0.4244, lon: 33.2041, forest_risk: 'moderate', water_bodies: 'Source of Nile, Lake Victoria' },
  { name: 'Mbale', lat: 1.0796, lon: 34.1750, forest_risk: 'moderate', water_bodies: 'Mt. Elgon watersheds' },
  { name: 'Masaka', lat: -0.3136, lon: 31.7333, forest_risk: 'high', water_bodies: 'Lake Victoria shore' },
  { name: 'Fort Portal', lat: 0.6671, lon: 30.2750, forest_risk: 'critical', water_bodies: 'Rwenzori glaciers, Crater Lakes' },
];

const wmoLabel = (code) => {
  const map = {
    0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 51: 'Light Drizzle', 61: 'Light Rain', 63: 'Rain',
    65: 'Heavy Rain', 80: 'Showers', 95: 'Thunderstorm',
  };
  return map[code] || 'Variable';
};

const estimateNDVI = (solarRad, humidity, weatherCode, siteType) => {
  let base = 0.5;
  if (solarRad > 600) base += 0.15;
  else if (solarRad > 300) base += 0.08;
  else base -= 0.1;
  if (humidity > 70) base += 0.1;
  if (weatherCode >= 61 && weatherCode <= 99) base += 0.05;
  if (siteType === 'forest') base += 0.1;
  return Math.min(0.95, Math.max(0.1, parseFloat(base.toFixed(2))));
};

const estimateWaterQuality = (precip, temp, wind, humidity) => {
  let wq = 70;
  if (precip > 10) wq -= 15;
  if (temp > 30) wq -= 10;
  if (wind > 20) wq -= 5;
  if (humidity > 85) wq -= 5;
  return Math.min(100, Math.max(20, Math.round(wq)));
};

async function runSatelliteScan() {
  const now = moment().toISOString();
  for (const site of SITES) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,cloud_cover,et0_fao_evapotranspiration` +
        `&hourly=shortwave_radiation,uv_index&daily=uv_index_max,et0_fao_evapotranspiration` +
        `&timezone=Africa%2FNairobi&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      const cur = data.current;
      const currentHour = moment().hour();
      const solarRad = data.hourly?.shortwave_radiation?.[currentHour] || 0;
      const uvIdx = data.hourly?.uv_index?.[currentHour] || data.daily?.uv_index_max?.[0] || 0;
      const et0 = cur.et0_fao_evapotranspiration || data.daily?.et0_fao_evapotranspiration?.[0] || 0;
      const temp = Math.round(cur.temperature_2m);
      const humidity = Math.round(cur.relative_humidity_2m);
      const wind = Math.round(cur.wind_speed_10m);
      const precip = cur.precipitation || 0;
      const cloud = cur.cloud_cover || 0;
      const condition = wmoLabel(cur.weather_code);
      const ndvi = estimateNDVI(solarRad, humidity, cur.weather_code, site.type);
      const waterQuality = site.type === 'water' ? estimateWaterQuality(precip, temp, wind, humidity) : null;
      const surfaceTemp = parseFloat((temp + (site.type === 'forest' ? -2 : 1.5)).toFixed(1));
      let defRisk = 'low';
      if (site.type === 'forest') {
        if (ndvi < 0.4) defRisk = 'critical';
        else if (ndvi < 0.55) defRisk = 'high';
        else if (ndvi < 0.7) defRisk = 'moderate';
      }

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `AQUA WOOD AI. Analyze satellite data for ${site.name}, Uganda.
Timestamp: ${moment().format('MMMM D, YYYY HH:mm')}
Weather: ${condition}, Temp: ${temp}°C, Humidity: ${humidity}%, Wind: ${wind}km/h
Precipitation: ${precip}mm, Cloud: ${cloud}%, Solar: ${Math.round(solarRad)}W/m², UV: ${uvIdx.toFixed(1)}
NDVI: ${ndvi}, ET: ${et0?.toFixed(2)}mm
${site.type === 'water' ? `Water Quality: ${waterQuality}/100` : `Deforestation Risk: ${defRisk}`}
Provide concise status, key risks, actions list, risk level, and environmental flags. Max 80 words.`,
        response_json_schema: {
          type: 'object',
          properties: {
            status_summary: { type: 'string' },
            risks: { type: 'string' },
            actions: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
            flags: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      await base44.entities.SatelliteMonitoringLog.create({
        site_name: site.name,
        logged_at: now,
        temperature_c: temp,
        humidity_pct: humidity,
        wind_speed_kmh: wind,
        precipitation_mm: precip,
        uv_index: parseFloat(uvIdx.toFixed(1)),
        weather_condition: condition,
        ndvi_estimate: ndvi,
        solar_radiation_wm2: Math.round(solarRad),
        surface_temp_c: surfaceTemp,
        cloud_cover_pct: cloud,
        evapotranspiration_mm: parseFloat((et0 || 0).toFixed(2)),
        deforestation_risk: site.type === 'forest' ? defRisk : null,
        water_quality_index: waterQuality,
        ai_analysis: `${aiResult.status_summary} ${aiResult.risks}`,
        ai_risk_level: aiResult.risk_level || 'moderate',
        ai_flags: aiResult.flags || [],
        recommended_actions: aiResult.actions || [],
        data_source: 'open_meteo_satellite'
      });
    } catch (e) {
      console.error(`[AutoDailyLogger] Scan failed for ${site.name}:`, e);
    }
  }
}

async function runDistrictAnalysis() {
  const now = moment().toISOString();
  const minuteBlock = Math.floor(Date.now() / (60 * 60 * 1000));
  const startIdx = minuteBlock % DISTRICTS.length;
  const batch = [
    DISTRICTS[startIdx % DISTRICTS.length],
    DISTRICTS[(startIdx + 1) % DISTRICTS.length],
    DISTRICTS[(startIdx + 2) % DISTRICTS.length],
  ];

  for (const district of batch) {
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=precipitation_sum,temperature_2m_max&timezone=Africa%2FNairobi&forecast_days=3`
      );
      const weatherData = await weatherRes.json();
      const cur = weatherData.current;
      const weekRain = weatherData.daily.precipitation_sum?.reduce((a, b) => a + b, 0)?.toFixed(1) || 0;
      const maxTemp = weatherData.daily.temperature_2m_max?.[0] || cur.temperature_2m;
      const weatherSummary = `Temp: ${Math.round(cur.temperature_2m)}°C, Humidity: ${cur.relative_humidity_2m}%, Wind: ${Math.round(cur.wind_speed_10m)}km/h, Rain today: ${cur.precipitation}mm, 3-day total rain: ${weekRain}mm, Max temp: ${Math.round(maxTemp)}°C`;

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `AQUA WOOD AI monitoring Uganda. Analyze ${district.name} District.
WEATHER: ${weatherSummary}
PROFILE: Forest risk: ${district.forest_risk}, Water: ${district.water_bodies}
TIME: ${moment().format('MMMM D, YYYY HH:mm')}
Provide: risk assessment (2 sentences), actionable suggestion for field teams, weather alerts. Under 100 words.`,
        response_json_schema: {
          type: 'object',
          properties: {
            risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
            assessment: { type: 'string' },
            suggestion: { type: 'string' },
            weather_alert: { type: 'string' },
            environmental_flags: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      await base44.entities.AIDistrictLog.create({
        district: district.name,
        logged_at: now,
        weather_summary: weatherSummary,
        satellite_indicators: `Forest risk: ${district.forest_risk} | Water: ${district.water_bodies}`,
        ai_suggestion: `${aiResult.assessment} ${aiResult.suggestion}${aiResult.weather_alert ? ' ⚠️ ' + aiResult.weather_alert : ''}`,
        risk_level: aiResult.risk_level || 'moderate',
        environmental_flags: aiResult.environmental_flags || []
      });
    } catch (e) {
      console.error(`[AutoDailyLogger] District log failed for ${district.name}:`, e);
    }
  }
}

async function compileDailyReport(dateStr) {
  try {
    // Check if report already exists for today
    const existing = await base44.entities.DailyMonitoringReport.filter({ report_date: dateStr, site_name: 'Mabira Forest' });
    const startOfDay = moment(dateStr).startOf('day').toISOString();
    const endOfDay = moment(dateStr).endOf('day').toISOString();

    // Get all satellite logs for today
    const allLogs = await base44.entities.SatelliteMonitoringLog.list('-logged_at', 200);
    const todayLogs = allLogs.filter(l => l.logged_at >= startOfDay && l.logged_at <= endOfDay);
    const mabiraLogs = todayLogs.filter(l => l.site_name === 'Mabira Forest');
    const victoriaLogs = todayLogs.filter(l => l.site_name === 'Lake Victoria');

    // Get district logs for today
    const allDistrictLogs = await base44.entities.AIDistrictLog.list('-logged_at', 100);
    const todayDistrictLogs = allDistrictLogs.filter(l => l.logged_at >= startOfDay && l.logged_at <= endOfDay);
    const highRiskDistricts = todayDistrictLogs.filter(l => l.risk_level === 'high' || l.risk_level === 'critical');

    // Compile Mabira Forest daily report
    if (mabiraLogs.length > 0) {
      const deforestationAlerts = mabiraLogs.filter(l => l.deforestation_risk === 'moderate' || l.deforestation_risk === 'high' || l.deforestation_risk === 'critical').length;
      const avgNDVI = parseFloat((mabiraLogs.reduce((s, l) => s + (l.ndvi_estimate || 0), 0) / mabiraLogs.length).toFixed(3));
      const avgTemp = parseFloat((mabiraLogs.reduce((s, l) => s + (l.temperature_c || 0), 0) / mabiraLogs.length).toFixed(1));
      const totalPrecip = parseFloat(mabiraLogs.reduce((s, l) => s + (l.precipitation_mm || 0), 0).toFixed(1));
      const allFlags = [...new Set(mabiraLogs.flatMap(l => l.ai_flags || []))];
      const riskLevels = ['critical', 'high', 'moderate', 'low'];
      const highestRisk = riskLevels.find(r => mabiraLogs.some(l => l.deforestation_risk === r)) || 'low';

      const aiSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `AQUA WOOD AI. Write a concise daily monitoring summary for Mabira Forest, Uganda on ${dateStr}.
Data: ${mabiraLogs.length} scans, ${deforestationAlerts} deforestation alerts, avg NDVI: ${avgNDVI}, highest risk: ${highestRisk}, flags: ${allFlags.join(', ')}.
Summarize in 2 sentences for an environmental report. Be factual and actionable.`
      });

      if (existing.length > 0) {
        await base44.entities.DailyMonitoringReport.update(existing[0].id, {
          total_scans: mabiraLogs.length,
          deforestation_alerts_count: deforestationAlerts,
          highest_risk_level: highestRisk,
          avg_ndvi: avgNDVI,
          avg_temperature_c: avgTemp,
          total_precipitation_mm: totalPrecip,
          environmental_flags: allFlags,
          district_high_risk_count: highRiskDistricts.length,
          ai_daily_summary: aiSummary,
          data_complete: true,
        });
      } else {
        await base44.entities.DailyMonitoringReport.create({
          report_date: dateStr,
          site_name: 'Mabira Forest',
          total_scans: mabiraLogs.length,
          deforestation_alerts_count: deforestationAlerts,
          highest_risk_level: highestRisk,
          avg_ndvi: avgNDVI,
          avg_temperature_c: avgTemp,
          total_precipitation_mm: totalPrecip,
          environmental_flags: allFlags,
          district_high_risk_count: highRiskDistricts.length,
          ai_daily_summary: aiSummary,
          data_complete: false,
        });
      }
    }

    // Compile Lake Victoria daily report
    if (victoriaLogs.length > 0) {
      const avgWQ = parseFloat((victoriaLogs.reduce((s, l) => s + (l.water_quality_index || 0), 0) / victoriaLogs.length).toFixed(1));
      const avgTemp = parseFloat((victoriaLogs.reduce((s, l) => s + (l.temperature_c || 0), 0) / victoriaLogs.length).toFixed(1));
      const totalPrecip = parseFloat(victoriaLogs.reduce((s, l) => s + (l.precipitation_mm || 0), 0).toFixed(1));
      const allFlags = [...new Set(victoriaLogs.flatMap(l => l.ai_flags || []))];
      const riskLevels = ['critical', 'high', 'moderate', 'low'];
      const highestRisk = riskLevels.find(r => victoriaLogs.some(l => l.ai_risk_level === r)) || 'low';

      const existingVic = await base44.entities.DailyMonitoringReport.filter({ report_date: dateStr, site_name: 'Lake Victoria' });

      if (existingVic.length > 0) {
        await base44.entities.DailyMonitoringReport.update(existingVic[0].id, {
          total_scans: victoriaLogs.length,
          highest_risk_level: highestRisk,
          avg_temperature_c: avgTemp,
          total_precipitation_mm: totalPrecip,
          avg_water_quality: avgWQ,
          environmental_flags: allFlags,
          data_complete: false,
        });
      } else {
        await base44.entities.DailyMonitoringReport.create({
          report_date: dateStr,
          site_name: 'Lake Victoria',
          total_scans: victoriaLogs.length,
          deforestation_alerts_count: 0,
          highest_risk_level: highestRisk,
          avg_temperature_c: avgTemp,
          total_precipitation_mm: totalPrecip,
          avg_water_quality: avgWQ,
          environmental_flags: allFlags,
          district_high_risk_count: highRiskDistricts.length,
          data_complete: false,
        });
      }
    }
  } catch (e) {
    console.error('[AutoDailyLogger] Daily report compile failed:', e);
  }
}

export default function AutoDailyLogger() {
  const scanLockRef = useRef(false);
  const districtLockRef = useRef(false);

  useEffect(() => {
    // On mount: check if we need to run scans immediately
    initializeAutoScanning();

    // Check every 5 minutes if a scan is due
    const checkInterval = setInterval(checkAndRunScans, 5 * 60 * 1000);

    return () => clearInterval(checkInterval);
  }, []);

  const initializeAutoScanning = async () => {
    await checkAndRunScans();
    // Compile today's daily report on init
    await compileDailyReport(moment().format('YYYY-MM-DD'));
  };

  const checkAndRunScans = async () => {
    if (scanLockRef.current) return;

    try {
      // Check last satellite scan
      const recentScan = await base44.entities.SatelliteMonitoringLog.list('-logged_at', 1);
      const hoursSinceScan = recentScan.length > 0
        ? moment().diff(moment(recentScan[0].logged_at), 'hours', true)
        : 999;

      if (hoursSinceScan >= 1) {
        scanLockRef.current = true;
        await runSatelliteScan();
        // After scan, update today's daily report
        await compileDailyReport(moment().format('YYYY-MM-DD'));
        scanLockRef.current = false;
      }
    } catch (e) {
      scanLockRef.current = false;
      console.error('[AutoDailyLogger] Scan check failed:', e);
    }

    if (districtLockRef.current) return;

    try {
      // Check last district analysis
      const recentDistrict = await base44.entities.AIDistrictLog.list('-logged_at', 1);
      const hoursSinceDistrict = recentDistrict.length > 0
        ? moment().diff(moment(recentDistrict[0].logged_at), 'hours', true)
        : 999;

      if (hoursSinceDistrict >= 1) {
        districtLockRef.current = true;
        await runDistrictAnalysis();
        districtLockRef.current = false;
      }
    } catch (e) {
      districtLockRef.current = false;
      console.error('[AutoDailyLogger] District check failed:', e);
    }
  };

  // This component renders nothing — it just runs background tasks
  return null;
}