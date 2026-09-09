import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers, AlertTriangle, MapPin, Activity, Satellite, Flame, Thermometer, Leaf, Brain,
  X, Search, Filter, ChevronRight, ChevronUp, ChevronDown, Loader2, Globe, Eye, ZoomIn,
  Save, CheckCircle, Shield, Zap, FileText,
  Plus, Navigation, Ruler, Droplets, Waves, Undo2, Trash2, CheckSquare,
} from 'lucide-react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline,
  useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from "@/lib/utils";
import moment from 'moment';

import MonitoringForm from '@/components/monitoring/MonitoringForm';
import MonitoringResults from '@/components/monitoring/MonitoringResults';
import MonitoringHistory from '@/components/monitoring/MonitoringHistory';
import ReportsZonesPanel from '@/components/monitoring/ReportsZonesPanel';
import {
  calculatePolygonArea, calculatePerimeter, getCentroid,
  estimateDistrict, captureGPS, formatArea, formatDistance,
} from '@/lib/geoUtils';
import { fetchSatelliteData } from '@/lib/satelliteFetcher';
import { evaluateAlerts, createAlerts, notifyAdminsNewActivity } from '@/lib/alertEngine';

// Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_CONFIG = {
  deforestation: { color: '#22c55e', label: 'Deforestation' },
  water_pollution: { color: '#3b82f6', label: 'Water Pollution' },
  illegal_activity: { color: '#ef4444', label: 'Illegal Activity' },
  wildlife: { color: '#f59e0b', label: 'Wildlife' },
  other: { color: '#6b7280', label: 'Other' },
};

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', label: 'Critical' },
  high: { color: '#f97316', label: 'High' },
  medium: { color: '#eab308', label: 'Medium' },
  low: { color: '#22c55e', label: 'Low' },
};

const RISK_COLORS = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
};
const RISK_BG = {
  critical: 'rgba(239,68,68,0.08)', high: 'rgba(249,115,22,0.08)',
  medium: 'rgba(234,179,8,0.08)', low: 'rgba(34,197,94,0.08)',
};

const OVERLAYS = [
  { value: 'satellite', label: 'Satellite Imagery', icon: Satellite },
  { value: 'ndvi', label: 'NDVI — Vegetation', icon: Leaf },
  { value: 'ndwi', label: 'Water & Flood Detection', icon: Droplets },
  { value: 'fire', label: 'Fire Detection (False-Color)', icon: Flame },
  { value: 'flood', label: 'Flood Detection 3-Day', icon: Waves },
  { value: 'land_cover', label: 'Land Cover', icon: Globe },
  { value: 'temperature', label: 'Land Surface Temp', icon: Thermometer },
  { value: 'false_color', label: 'False Color', icon: Eye },
  { value: 'street', label: 'Street Map', icon: Globe },
];

const CATEGORY_COLORS = {
  forest: '#22c55e', wetland: '#06b6d4', agriculture: '#f59e0b',
  tree_plantation: '#16a34a', water_body: '#3b82f6',
  wildlife: '#f97316', environmental_monitoring: '#a855f7',
};

// Real satellite layer color guidelines (per NASA GIBS documentation)
const LAYER_GUIDES = {
  satellite: { title: 'Esri World Imagery', desc: 'True-color satellite photography', items: [] },
  street: { title: 'OpenStreetMap', desc: 'Standard street map', items: [] },
  ndvi: {
    title: 'NDVI — Vegetation Health',
    desc: 'MODIS Terra 8-Day · NASA GIBS',
    items: [
      { color: '#003280', label: 'Water / Cloud (−0.3 to 0)' },
      { color: '#824100', label: 'Bare soil (0 – 0.1)' },
      { color: '#ffff00', label: 'Sparse vegetation (0.1 – 0.3)' },
      { color: '#82c828', label: 'Moderate vegetation (0.3 – 0.5)' },
      { color: '#328c1e', label: 'Healthy forest (> 0.5)' },
      { color: '#0a3c0a', label: 'Very dense canopy (> 0.8)' },
    ],
  },
  ndwi: {
    title: 'Water & Flood Detection',
    desc: 'MODIS Combined Flood 3-Day · NASA GIBS',
    items: [
      { color: 'transparent', label: 'Dry land (no water)', border: true },
      { color: '#3b82f6', label: 'Shallow water' },
      { color: '#1e40af', label: 'Moderate flood' },
      { color: '#1e3a8a', label: 'Deep flood water' },
    ],
  },
  flood: {
    title: 'Flood Detection 3-Day',
    desc: 'MODIS Combined Flood 3-Day · NASA GIBS',
    items: [
      { color: 'transparent', label: 'Dry land (no flood)', border: true },
      { color: '#60a5fa', label: 'Standing water' },
      { color: '#2563eb', label: 'Flooded area' },
      { color: '#1e3a8a', label: 'Severe flooding' },
    ],
  },
  fire: {
    title: 'Fire Detection (False-Color B7-2-1)',
    desc: 'MODIS Terra · NASA GIBS',
    items: [
      { color: '#ff0000', label: 'Active fire (bright red)' },
      { color: '#4a2010', label: 'Burn scar (dark)' },
      { color: '#2d5a1e', label: 'Healthy vegetation (green)' },
      { color: '#000000', label: 'Water / clear land' },
    ],
  },
  temperature: {
    title: 'Land Surface Temperature',
    desc: 'MODIS Terra Day LST · NASA GIBS',
    items: [
      { color: '#1400aa', label: 'Cold (< 0°C)' },
      { color: '#3c96c8', label: 'Cool (0 – 15°C)' },
      { color: '#50c864', label: 'Mild (15 – 25°C)' },
      { color: '#f0d828', label: 'Warm (25 – 35°C)' },
      { color: '#f0501e', label: 'Hot (35 – 45°C)' },
      { color: '#b40000', label: 'Very hot (> 45°C)' },
    ],
  },
  land_cover: {
    title: 'IGBP Land Cover Classification',
    desc: 'MODIS Combined Annual · NASA GIBS',
    items: [
      { color: '#2d7a2d', label: 'Forest (Evergreen/Deciduous)' },
      { color: '#82c828', label: 'Shrubland / Grassland' },
      { color: '#f0c828', label: 'Cropland / Agriculture' },
      { color: '#8a8a8a', label: 'Urban / Built-up' },
      { color: '#3b82f6', label: 'Water bodies' },
      { color: '#e0e0e0', label: 'Barren / Sparse' },
    ],
  },
  false_color: {
    title: 'False Color (Bands 3-6-7)',
    desc: 'MODIS Terra · NASA GIBS',
    items: [
      { color: '#dc143c', label: 'Healthy vegetation (red)' },
      { color: '#8b4513', label: 'Bare soil (brown)' },
      { color: '#000000', label: 'Water (black)' },
      { color: '#ffffff', label: 'Cloud / Snow (white)' },
    ],
  },
};

const createReportIcon = (type, severity) => {
  const colors = { deforestation: '#22c55e', water_pollution: '#3b82f6', illegal_activity: '#ef4444', wildlife: '#f59e0b', other: '#6b7280' };
  const pulseColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
  const base = colors[type] || '#6b7280';
  const pulse = pulseColors[severity] || base;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${pulse};opacity:0.25;animation:ping 1.5s infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:${base};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
    </div>`,
    iconSize: [32, 32], iconAnchor: [16, 16],
  });
};

const gpsIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const vertexIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && isFinite(center[0]) && isFinite(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
    }
  }, [center, zoom]);
  return null;
}

function MapClickHandler({ drawMode, clickMode, onDrawClick, onAnalyzeClick }) {
  useMapEvents({
    click: (e) => {
      if (drawMode) onDrawClick(e.latlng);
      else if (clickMode) onAnalyzeClick(e.latlng);
    }
  });
  return null;
}

function OverlayLayer({ type, date, onError }) {
  const gibs = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

  // Thematic overlays — each GIBS TileMatrixSet has a max native zoom;
  // Leaflet upscales tiles beyond that level instead of requesting non-existent ones
  const thematic = {
    ndvi: { url: `${gibs}/MODIS_Terra_NDVI_8Day/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, attr: 'NASA GIBS / MODIS NDVI 8-Day', maxNativeZoom: 9 },
    ndwi: { url: `${gibs}/MODIS_Combined_Flood_3-Day/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, attr: 'NASA GIBS / MODIS Flood & Water Detection', maxNativeZoom: 9 },
    fire: { url: `${gibs}/MODIS_Terra_CorrectedReflectance_Bands721/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, attr: 'NASA GIBS / MODIS False-Color Fire (B7-2-1)', maxNativeZoom: 9 },
    flood: { url: `${gibs}/MODIS_Combined_Flood_3-Day/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, attr: 'NASA GIBS / MODIS Flood Detection 3-Day', maxNativeZoom: 9 },
    land_cover: { url: `${gibs}/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/2024-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`, attr: 'NASA GIBS / MODIS IGBP Land Cover', maxNativeZoom: 8 },
    temperature: { url: `${gibs}/MODIS_Terra_Land_Surface_Temp_Day/default/${date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`, attr: 'NASA GIBS / MODIS Land Surface Temp', maxNativeZoom: 7 },
    false_color: { url: `${gibs}/MODIS_Terra_CorrectedReflectance_Bands367/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, attr: 'NASA GIBS / MODIS False-Color (B3-6-7)', maxNativeZoom: 9 },
  };

  const isStreet = type === 'street';
  const overlay = thematic[type];

  return (
    <>
      {/* Base layer — ALWAYS rendered so the map is never blank */}
      {isStreet ? (
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap contributors" />
      ) : (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri, Maxar, GeoEye, Earthstar Geographics"
          maxZoom={19}
        />
      )}

      {/* Thematic overlay — GIBS layer on top of base (transparent PNG shows base through) */}
      {overlay && (
        <TileLayer
          key={`${type}-${date}`}
          url={overlay.url}
          attribution={overlay.attr}
          opacity={0.9}
          maxNativeZoom={overlay.maxNativeZoom}
          maxZoom={19}
          eventHandlers={{ tileerror: () => onError?.() }}
        />
      )}
    </>
  );
}

export default function Map() {
  const { toast } = useToast();
  // Existing state
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overlayType, setOverlayType] = useState('satellite');
  const [mapDate, setMapDate] = useState('2026-07-01');
  const [mapCenter, setMapCenter] = useState([0.3476, 32.5825]);
  const [mapZoom, setMapZoom] = useState(7);
  const [clickMode, setClickMode] = useState(false);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState('monitoring');

  // New monitoring state
  const [mode, setMode] = useState('view');
  const [monitoringForm, setMonitoringForm] = useState({ activity_name: '', category: '' });
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [drawFinished, setDrawFinished] = useState(false);
  const [area, setArea] = useState(0);
  const [perimeter, setPerimeter] = useState(0);
  const [saving, setSaving] = useState(false);
  const [monitoringActivities, setMonitoringActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [generatedAlerts, setGeneratedAlerts] = useState([]);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [gibsError, setGibsError] = useState(false);

  useEffect(() => { loadData(); }, []);

  // Auto-capture visitor GPS on first load and zoom to their location
  useEffect(() => {
    setGpsLoading(true);
    captureGPS().then((result) => {
      setGps(result);
      if (!result.error) {
        setMapCenter([result.lat, result.lng]);
        setMapZoom(15);
      }
      setGpsLoading(false);
    });
  }, []);

  // Reset error when overlay or date changes
  useEffect(() => { setGibsError(false); }, [overlayType, mapDate]);

  const loadData = async () => {
    try {
      const [reportsData, zonesData, activitiesData] = await Promise.all([
        base44.entities.Report.list('-created_date', 200).catch(() => []),
        base44.entities.MonitoringZone.list('-created_date', 50).catch(() => []),
        base44.entities.MonitoringActivity.list('-monitoring_date', 100).catch(() => []),
      ]);
      setReports(reportsData);
      setZones(zonesData);
      setMonitoringActivities(activitiesData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // GPS capture
  const handleCaptureGPS = async () => {
    setGpsLoading(true);
    const result = await captureGPS();
    setGps(result);
    if (!result.error) {
      setMapCenter([result.lat, result.lng]);
      setMapZoom(15);
    }
    setGpsLoading(false);
  };

  // New monitoring activity
  const handleNewActivity = async () => {
    setClickMode(false);
    setClickedPoint(null);
    setAiAnalysis(null);
    setMode('creating');
    setMonitoringForm({ activity_name: '', category: '' });
    setDrawPoints([]);
    setDrawFinished(false);
    setDrawMode(false);
    setArea(0);
    setPerimeter(0);
    setGeneratedAlerts([]);
    setSelectedActivity(null);
    setMobilePanelOpen(true);
    setMobilePanelExpanded(true);
    setMobileTab('monitoring');
    // Auto-capture GPS
    setGpsLoading(true);
    const result = await captureGPS();
    setGps(result);
    if (!result.error) {
      setMapCenter([result.lat, result.lng]);
      setMapZoom(15);
    }
    setGpsLoading(false);
  };

  const handleCancel = () => {
    setMode('view');
    setMonitoringForm({ activity_name: '', category: '' });
    setDrawPoints([]);
    setDrawFinished(false);
    setDrawMode(false);
    setArea(0);
    setPerimeter(0);
    setGps(null);
    setGeneratedAlerts([]);
    setSelectedActivity(null);
  };

  // Drawing handlers
  const handleStartDrawing = () => {
    setDrawMode(true);
    setDrawFinished(false);
    setClickMode(false);
    setMobilePanelExpanded(false); // Minimize panel so map is tappable
  };

  const handleDrawClick = (latlng) => {
    if (!drawMode) return;
    setDrawPoints(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
  };

  const handleUndoPoint = () => setDrawPoints(prev => prev.slice(0, -1));

  const handleFinishDrawing = () => {
    setDrawMode(false);
    setDrawFinished(true);
    if (drawPoints.length >= 3) {
      setArea(calculatePolygonArea(drawPoints));
      setPerimeter(calculatePerimeter(drawPoints));
    }
    setMobilePanelExpanded(true); // Expand panel on mobile after finishing
  };

  const handleClearDrawing = () => {
    setDrawPoints([]);
    setDrawFinished(false);
    setArea(0);
    setPerimeter(0);
    setDrawMode(false);
  };

  // Save & retrieve satellite data
  const handleSave = async () => {
    // Validate inputs — show specific errors instead of failing silently
    if (!monitoringForm.activity_name || !monitoringForm.category) {
      toast({ variant: "destructive", title: "Missing details", description: "Enter an activity name and select a category first." });
      return;
    }
    const hasPolygon = drawPoints.length >= 3;
    if (!hasPolygon && (!gps || gps.error)) {
      toast({ variant: "destructive", title: "Location required", description: "Capture GPS or draw a boundary on the map first." });
      return;
    }

    // Use polygon centroid if drawn, otherwise fall back to GPS coordinates
    const center = hasPolygon
      ? getCentroid(drawPoints)
      : { lat: gps.lat, lng: gps.lng };
    if (!center || !isFinite(center.lat) || !isFinite(center.lng)) {
      toast({ variant: "destructive", title: "Invalid location", description: "Could not determine a valid location. Try redrawing the boundary." });
      return;
    }

    // Visitors must login or sign up before saving
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (!user) {
      toast({ title: "Login Required", description: "Please sign in or create an account to save and retrieve satellite data." });
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setSaving(true);
    toast({ title: "Saving activity...", description: `Retrieving satellite data for ${hasPolygon ? 'drawn boundary' : 'GPS location'}.` });

    try {
    const district = await estimateDistrict(center.lat, center.lng);
    // user already fetched above (auth check)

    // 1. Create monitoring activity
    const activity = await base44.entities.MonitoringActivity.create({
      activity_name: monitoringForm.activity_name,
      category: monitoringForm.category,
      user_id: user?.id || '',
      user_name: user?.full_name || user?.email || 'Field Officer',
      geometry: hasPolygon ? drawPoints : [],
      latitude: Number(center.lat),
      longitude: Number(center.lng),
      area_sqm: Number(area) || 0,
      perimeter_m: Number(perimeter) || 0,
      monitoring_date: new Date().toISOString(),
      district,
      status: 'active',
    });

    // 2. Fetch satellite data (NASA GIBS pixel samples + Copernicus + Open-Meteo)
    let satelliteResult = null;
    try {
      satelliteResult = await fetchSatelliteData(center.lat, center.lng, monitoringForm.category, mapDate);
    } catch (e) { console.error('Satellite fetch error:', e); }

    // 3. Update activity with satellite data
    const indicators = satelliteResult?.indicators || {};
    let updated = activity;
    try {
      updated = await base44.entities.MonitoringActivity.update(activity.id, {
        satellite_provider: indicators.satellite_provider,
        satellite_name: indicators.satellite_name,
        acquisition_date: indicators.acquisition_date,
        processing_date: indicators.processing_date,
        spatial_resolution_m: indicators.spatial_resolution_m,
        cloud_percentage: indicators.cloud_percentage,
        ndvi: indicators.ndvi,
        ndwi: indicators.ndwi,
        surface_temp_c: indicators.surface_temp_c,
        vegetation_status: indicators.vegetation_status,
        water_presence: indicators.water_presence,
        water_detected: indicators.water_detected,
        flood_risk: indicators.flood_risk,
        fire_risk: indicators.fire_risk,
        rainfall_mm: indicators.rainfall_mm,
        temperature_c: indicators.temperature_c,
        humidity_pct: indicators.humidity_pct,
        land_cover: indicators.land_cover,
      });
    } catch (e) { console.error('Update error:', e); }

    // 4. Evaluate alerts (rule-based with safeguards: cloud gating, baseline, dedup)
    const alertObjects = evaluateAlerts(updated, indicators, monitoringActivities);
    const createdAlerts = await createAlerts(updated, alertObjects);

    // 5. Notify admins via existing Alert entity
    await notifyAdminsNewActivity(updated);

    // 6. Update alert_generated flag
    if (createdAlerts.length > 0) {
      try { await base44.entities.MonitoringActivity.update(activity.id, { alert_generated: true }); } catch (e) {}
    }

    // 7. Create a Report record so satellite data appears in Reports page + Reports tab
    const catToReportType = {
      forest: 'deforestation', tree_plantation: 'deforestation',
      water_body: 'water_pollution', wetland: 'water_pollution',
      wildlife: 'wildlife', agriculture: 'other', environmental_monitoring: 'other',
    };
    const reportType = catToReportType[monitoringForm.category] || 'other';
    const riskSeverity = (level) => ({ critical: 'critical', high: 'high', medium: 'medium', low: 'low' }[level] || 'low');
    const reportSeverity = indicators.fire_risk === 'critical' || indicators.flood_risk === 'critical'
      ? 'critical'
      : indicators.fire_risk === 'high' || indicators.flood_risk === 'high'
        ? 'high'
        : (indicators.fire_risk === 'medium' || indicators.flood_risk === 'medium' ? 'medium' : 'low');

    const ind = indicators;
    const satSummary = [
      `Satellite Monitoring Report — ${monitoringForm.activity_name}`,
      ``,
      `Category: ${monitoringForm.category?.replace(/_/g, ' ')}`,
      `District: ${district}`,
      `Date: ${moment(new Date()).format('MMM D, YYYY HH:mm')}`,
      ``,
      `Satellite Data Sources: ${ind.satellite_provider || 'N/A'}`,
      `Satellite: ${ind.satellite_name || 'N/A'}`,
      `Spatial Resolution: ${ind.spatial_resolution_m || '—'}m`,
      `Cloud Cover: ${ind.cloud_percentage != null ? Math.round(ind.cloud_percentage) + '%' : '—'}`,
      ``,
      `Environmental Indicators (real satellite data):`,
      `• NDVI: ${ind.ndvi != null ? ind.ndvi.toFixed(3) : '—'} (${ind.vegetation_status || 'unknown'})`,
      `• NDWI: ${ind.ndwi != null ? ind.ndwi.toFixed(3) : '—'}${ind.water_detected ? ' [Water detected]' : ''}`,
      `• Surface Temp: ${ind.surface_temp_c != null ? ind.surface_temp_c.toFixed(1) + '°C' : '—'}`,
      `• Air Temp: ${ind.temperature_c != null ? ind.temperature_c.toFixed(1) + '°C' : '—'}`,
      `• Humidity: ${ind.humidity_pct != null ? Math.round(ind.humidity_pct) + '%' : '—'}`,
      `• Rainfall (3-day): ${ind.rainfall_mm != null ? ind.rainfall_mm.toFixed(1) + 'mm' : '—'}`,
      `• Land Cover: ${ind.land_cover || '—'}`,
      ``,
      `Risk Assessment:`,
      `• Fire Risk: ${ind.fire_risk?.toUpperCase() || 'LOW'}`,
      `• Flood Risk: ${ind.flood_risk?.toUpperCase() || 'LOW'}`,
      ...(createdAlerts.length > 0 ? [``, `Alerts Generated: ${createdAlerts.length}`] : []),
    ].join('\n');

    try {
      await base44.entities.Report.create({
        title: `[Satellite Monitor] ${monitoringForm.activity_name}`,
        type: reportType,
        description: satSummary,
        location: { lat: Number(center.lat), lng: Number(center.lng), address: `${district}, Uganda` },
        severity: reportSeverity,
        status: 'pending',
        evidence_description: `Auto-generated from Live Monitoring satellite retrieval. Satellite: ${ind.satellite_name || 'N/A'}, NDVI: ${ind.ndvi != null ? ind.ndvi.toFixed(2) : '—'}, NDWI: ${ind.ndwi != null ? ind.ndwi.toFixed(2) : '—'}`,
        verified: false,
        ai_analysis: satSummary,
        gps_accuracy: gps?.accuracy || null,
      });
    } catch (e) { console.error('Report creation error:', e); }

    setGeneratedAlerts(createdAlerts);
    setSelectedActivity({ ...updated, ...indicators });
    setMode('results');
    loadData(); // refresh history
    toast({ title: "Activity Saved ✓", description: `Satellite data retrieved for ${district}.` });
    } catch (e) {
      console.error('Save error:', e);
      toast({ variant: "destructive", title: "Save Failed", description: e.message?.slice(0, 150) || "Could not save the activity. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // Select historical activity
  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    setMode('results');
    setGeneratedAlerts([]);
    if (activity.geometry?.length > 0) {
      const c = getCentroid(activity.geometry);
      if (c) { setMapCenter([c.lat, c.lng]); setMapZoom(14); }
    } else if (activity.latitude != null) {
      setMapCenter([activity.latitude, activity.longitude]);
      setMapZoom(14);
    }
    setMobilePanelOpen(true);
    setMobilePanelExpanded(true);
    setMobileTab('monitoring');
  };

  // AI analysis on map click (existing functionality)
  const handleMapClick = async (latlng) => {
    setClickedPoint(latlng);
    setAiAnalysis(null);
    setSavedPlanId(null);
    setAnalyzing(true);

    const nearbyReports = reports.filter(r => {
      if (!r.location?.lat || !r.location?.lng) return false;
      const dLat = r.location.lat - latlng.lat;
      const dLng = r.location.lng - latlng.lng;
      return Math.sqrt(dLat * dLat + dLng * dLng) < 0.5;
    });

    let locName = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
      const geoData = await geoRes.json();
      locName = geoData.display_name || locName;
    } catch (_) {}
    setLocationName(locName);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are AQUA WOOD AI — an expert environmental scientist for Uganda.\n\nLocation clicked: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}\nLocation: ${locName}\nActive satellite overlay: ${overlayType.toUpperCase()} · Date: ${mapDate}\n\n${nearbyReports.length > 0 ? `Nearby incidents:\n${nearbyReports.map(r => `- [${r.severity?.toUpperCase()}] ${r.title}: ${r.description?.slice(0, 100)}`).join('\n')}` : 'No nearby reported incidents.'}\n\nProvide a comprehensive environmental action plan as JSON with these exact fields:\n- title: short descriptive title (string)\n- environmental_impact: 2-3 sentences (string)\n- risk_level: one of "low", "moderate", "high", "critical" (string)\n- risk_mitigation: 2-3 sentences (string)\n- suggested_actions: array of 5-7 specific actionable steps (array of strings)\n- full_analysis: full markdown analysis (string)\n\nReturn only valid JSON.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' }, environmental_impact: { type: 'string' },
            risk_level: { type: 'string' }, risk_mitigation: { type: 'string' },
            suggested_actions: { type: 'array', items: { type: 'string' } },
            full_analysis: { type: 'string' },
          }
        }
      });
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
      setAiAnalysis({ error: 'Analysis failed. Please try again.' });
    }
    setAnalyzing(false);
  };

  const handleSavePlan = async () => {
    if (!aiAnalysis || !clickedPoint) return;
    setSavingPlan(true);
    const plan = await base44.entities.ActionPlan.create({
      title: aiAnalysis.title || `Action Plan — ${locationName.slice(0, 60)}`,
      location_name: locationName,
      location: { lat: clickedPoint.lat, lng: clickedPoint.lng },
      overlay_type: overlayType,
      analysis_date: new Date().toISOString(),
      environmental_impact: aiAnalysis.environmental_impact,
      risk_level: aiAnalysis.risk_level,
      risk_mitigation: aiAnalysis.risk_mitigation,
      suggested_actions: aiAnalysis.suggested_actions,
      full_analysis: aiAnalysis.full_analysis,
      status: 'pending',
    });
    setSavedPlanId(plan.id);
    setSavingPlan(false);
  };

  const toggleClickMode = () => {
    if (!clickMode) {
      setMode('view');
      setDrawMode(false);
      setDrawPoints([]);
      setDrawFinished(false);
    } else {
      setClickedPoint(null);
      setAiAnalysis(null);
      setSavedPlanId(null);
    }
    setClickMode(!clickMode);
  };

  // Filtered reports (existing)
  const filteredReports = reports.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || r.type === filterType;
    const matchSev = filterSeverity === 'all' || r.severity === filterSeverity;
    return matchSearch && matchType && matchSev;
  });

  const validReports = filteredReports.filter(r =>
    r.location?.lat && r.location?.lng && isFinite(r.location.lat) && isFinite(r.location.lng)
  );
  const validZones = zones.filter(z =>
    z.center?.lat && z.center?.lng && isFinite(z.center.lat) && isFinite(z.center.lng)
  );
  const zoneColors = { healthy: '#22c55e', at_risk: '#f59e0b', critical: '#ef4444' };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  // Common sidebar props
  const sidebarProps = {
    searchQuery, setSearchQuery, filterType, setFilterType,
    filterSeverity, setFilterSeverity, clickMode, clickedPoint,
    analyzing, aiAnalysis, savedPlanId, savingPlan, handleSavePlan,
    setClickedPoint, setAiAnalysis, setSavedPlanId,
    validReports, filteredReports, reports, validZones, zoneColors,
    selectedReport, setSelectedReport, setMapCenter, setMapZoom,
  };

  // Sidebar content (shared between desktop and mobile)
  const renderSidebarContent = (onItemClick) => (
    <div className="flex flex-col gap-3 min-h-full">
      {/* Monitoring section */}
      {mode === 'creating' && (
        <MonitoringForm
          form={monitoringForm}
          setForm={setMonitoringForm}
          gps={gps}
          gpsLoading={gpsLoading}
          drawPoints={drawPoints}
          area={area}
          perimeter={perimeter}
          drawMode={drawMode}
          onCaptureGPS={handleCaptureGPS}
          onStartDrawing={handleStartDrawing}
          onFinishDrawing={handleFinishDrawing}
          onUndoPoint={handleUndoPoint}
          onClearDrawing={handleClearDrawing}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {mode === 'results' && selectedActivity && (
        <>
          <MonitoringResults activity={selectedActivity} alerts={generatedAlerts} />
          <Button size="sm" variant="outline" className="gap-1" onClick={handleNewActivity}>
            <Plus className="h-3.5 w-3.5" /> New Activity
          </Button>
        </>
      )}
      {mode === 'view' && (
        <Button onClick={handleNewActivity} className="gap-2 bg-brand-gradient">
          <Plus className="h-4 w-4" />
          New Monitoring Activity
        </Button>
      )}

      {/* Tabs: History + Reports */}
      <Tabs defaultValue={mobileTab} onValueChange={setMobileTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid grid-cols-2 shrink-0 h-8">
          <TabsTrigger value="monitoring" className="text-xs gap-1">
            <Activity className="h-3 w-3" /> History ({monitoringActivities.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1">
            <FileText className="h-3 w-3" /> Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="monitoring" className="flex-1 min-h-0 mt-2 overflow-hidden">
          <div className="h-full flex flex-col">
            <MonitoringHistory
              activities={monitoringActivities}
              onSelectActivity={(a) => { handleSelectActivity(a); onItemClick?.(); }}
              selectedId={selectedActivity?.id}
            />
          </div>
        </TabsContent>
        <TabsContent value="reports" className="flex-1 min-h-0 mt-2 overflow-hidden">
          <div className="h-full flex flex-col">
            <ReportsZonesPanel {...sidebarProps} onItemClick={onItemClick} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-11rem)] lg:h-[calc(100vh-7rem)] flex flex-col gap-2">
      {/* Top Controls Bar */}
      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto md:flex-wrap md:overflow-visible pb-1 md:pb-0 scrollbar-thin">
        {/* Layer Selector */}
        <Select value={overlayType} onValueChange={setOverlayType}>
          <SelectTrigger className="w-36 md:w-48 h-8 text-xs">
            <Layers className="h-3.5 w-3.5 mr-1 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[5000]">
            {OVERLAYS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                <span className="flex items-center gap-2">
                  <o.icon className="h-3.5 w-3.5" />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date picker for NASA layers */}
        {overlayType !== 'satellite' && overlayType !== 'street' && (
          <input
            type="date"
            value={mapDate}
            onChange={(e) => setMapDate(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 bg-background h-8 hidden sm:block"
            max="2026-07-07"
            min="2025-02-12"
          />
        )}

        {/* Boundaries toggle */}
        <Button
          size="sm"
          variant={showBoundaries ? "default" : "outline"}
          className="h-8 text-xs gap-1"
          onClick={() => setShowBoundaries(!showBoundaries)}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Boundaries</span>
        </Button>

        {/* New Activity / Cancel button */}
        {mode === 'creating' ? (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-xs gap-1 bg-brand-gradient" onClick={handleNewActivity}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Activity</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}

        {/* AI Analyze toggle */}
        <Button
          size="sm"
          variant={clickMode ? "default" : "outline"}
          className={cn("h-8 text-xs gap-1", clickMode && "animate-pulse")}
          onClick={toggleClickMode}
        >
          <Brain className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{clickMode ? 'AI ON' : 'AI Analyze'}</span>
          <span className="sm:hidden">AI</span>
        </Button>

        {/* Desktop Sidebar Toggle */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 ml-auto hidden md:flex"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <Filter className="h-3.5 w-3.5" />
          {showSidebar ? 'Hide' : 'Show'} Panel
        </Button>

        {/* Mobile Panel Toggle */}
        <Button
          size="sm"
          variant={mobilePanelOpen ? "default" : "outline"}
          className="h-8 text-xs gap-1 ml-auto md:hidden"
          onClick={() => {
            if (mobilePanelOpen) {
              setMobilePanelOpen(false);
            } else {
              setMobilePanelOpen(true);
              setMobilePanelExpanded(false);
            }
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          {mobilePanelOpen ? 'Hide' : 'Panel'}
        </Button>

        {/* Stats badges */}
        <Badge variant="outline" className="text-xs hidden lg:flex">
          {monitoringActivities.length} Activities
        </Badge>
        <Badge variant="outline" className="text-xs hidden lg:flex">
          {validReports.length} Reports
        </Badge>
      </div>

      {/* Main Content: Map + Sidebar */}
      <div className="flex-1 flex flex-row gap-2 md:gap-3 min-h-0 relative">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden md:flex w-80 shrink-0 flex-col gap-3 overflow-y-auto overflow-x-hidden">
            {renderSidebarContent()}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-border">
          {/* Drawing mode indicator */}
          {drawMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none whitespace-nowrap">
              <Ruler className="h-3.5 w-3.5 shrink-0" />
              <span>Click map to add boundary points ({drawPoints.length})</span>
            </div>
          )}
          {clickMode && !drawMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none whitespace-nowrap">
              <Brain className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Click any location for AI environmental analysis</span>
              <span className="sm:hidden">Tap map to analyze</span>
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className={drawMode ? 'cursor-crosshair' : clickMode ? 'cursor-crosshair' : ''}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler
              drawMode={drawMode}
              clickMode={clickMode && !drawMode}
              onDrawClick={handleDrawClick}
              onAnalyzeClick={handleMapClick}
            />
            <OverlayLayer type={overlayType} date={mapDate} onError={() => setGibsError(true)} />

            {/* Zone circles */}
            {validZones.map(z => (
              <Circle
                key={z.id}
                center={[z.center.lat, z.center.lng]}
                radius={18000}
                pathOptions={{ color: zoneColors[z.status] || '#22c55e', fillColor: zoneColors[z.status] || '#22c55e', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
              >
                <Popup>
                  <div className="p-2 min-w-[160px]">
                    <p className="font-bold text-sm">{z.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{z.type?.replace('_', ' ')} · {z.status?.replace('_', ' ')}</p>
                    {z.metrics?.forest_cover !== undefined && <p className="text-xs mt-1">Forest Cover: <b>{z.metrics.forest_cover}%</b></p>}
                    {z.metrics?.water_quality_index !== undefined && <p className="text-xs">Water Quality: <b>{z.metrics.water_quality_index}/100</b></p>}
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Report markers */}
            {validReports.map(r => (
              <Marker
                key={r.id}
                position={[r.location.lat, r.location.lng]}
                icon={createReportIcon(r.type, r.severity)}
                eventHandlers={{ click: () => { setSelectedReport(r); setMapCenter([r.location.lat, r.location.lng]); setMapZoom(13); } }}
              >
                <Popup maxWidth={280}>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="h-3 w-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: TYPE_CONFIG[r.type]?.color || '#6b7280' }} />
                      <div>
                        <p className="font-bold text-sm leading-tight">{r.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{TYPE_CONFIG[r.type]?.label}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{r.description}</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: SEVERITY_CONFIG[r.severity]?.color || '#6b7280' }}>{r.severity}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{r.status}</span>
                      {r.verified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verified</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">GPS: {r.location.lat.toFixed(4)}, {r.location.lng.toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Monitoring activity polygons */}
            {showBoundaries && monitoringActivities.map(activity =>
              activity.geometry?.length >= 3 ? (
                <Polygon
                  key={activity.id}
                  positions={activity.geometry.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: selectedActivity?.id === activity.id ? '#3b82f6' : (CATEGORY_COLORS[activity.category] || '#f59e0b'),
                    weight: selectedActivity?.id === activity.id ? 3 : 1.5,
                    fillOpacity: selectedActivity?.id === activity.id ? 0.2 : 0.1,
                  }}
                  eventHandlers={{ click: () => handleSelectActivity(activity) }}
                >
                  <Popup maxWidth={280}>
                    <div className="p-2 min-w-[220px]">
                      <p className="font-bold text-sm leading-tight">{activity.activity_name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="capitalize">{activity.category?.replace(/_/g, ' ')}</span>
                        {activity.district && <span>· {activity.district}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400">{moment(activity.monitoring_date).format('MMM D, YYYY HH:mm')}</p>
                      {activity.area_sqm > 0 && (
                        <div className="grid grid-cols-2 gap-1 mt-1.5">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                            <p className="text-[8px] text-gray-400 uppercase">Area</p>
                            <p className="text-[11px] font-bold">{formatArea(activity.area_sqm)}</p>
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                            <p className="text-[8px] text-gray-400 uppercase">Perimeter</p>
                            <p className="text-[11px] font-bold">{formatDistance(activity.perimeter_m)}</p>
                          </div>
                        </div>
                      )}
                      {activity.ndvi != null && (
                        <p className="text-[10px] mt-1.5">NDVI: <b>{activity.ndvi.toFixed(3)}</b> <span className="text-gray-400">({activity.vegetation_status || '—'})</span></p>
                      )}
                      {activity.ndwi != null && (
                        <p className="text-[10px]">NDWI: <b>{activity.ndwi.toFixed(3)}</b>{activity.water_detected ? ' 💧' : ''}</p>
                      )}
                      {activity.surface_temp_c != null && (
                        <p className="text-[10px]">Surface Temp: <b>{activity.surface_temp_c.toFixed(1)}°C</b></p>
                      )}
                      {activity.land_cover && (
                        <p className="text-[10px]">Land Cover: <b>{activity.land_cover}</b></p>
                      )}
                      <div className="grid grid-cols-2 gap-1 mt-1.5">
                        {activity.fire_risk && (
                          <div className="rounded p-1 text-center" style={{ background: RISK_BG[activity.fire_risk] }}>
                            <p className="text-[8px] text-gray-400 uppercase">Fire</p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: RISK_COLORS[activity.fire_risk] }}>{activity.fire_risk}</p>
                          </div>
                        )}
                        {activity.flood_risk && (
                          <div className="rounded p-1 text-center" style={{ background: RISK_BG[activity.flood_risk] }}>
                            <p className="text-[8px] text-gray-400 uppercase">Flood</p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: RISK_COLORS[activity.flood_risk] }}>{activity.flood_risk}</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-1.5 text-[9px]">
                        {activity.temperature_c != null && <span>🌡️ {activity.temperature_c.toFixed(1)}°C</span>}
                        {activity.humidity_pct != null && <span>💧 {Math.round(activity.humidity_pct)}%</span>}
                        {activity.rainfall_mm != null && <span>🌧️ {activity.rainfall_mm.toFixed(1)}mm</span>}
                      </div>
                      {activity.satellite_name && (
                        <p className="text-[8px] text-gray-400 mt-1.5 border-t pt-1">
                          🛰️ {activity.satellite_name} · {activity.spatial_resolution_m || '—'}m
                          {activity.cloud_percentage != null ? ' · ☁ ' + Math.round(activity.cloud_percentage) + '%' : ''}
                        </p>
                      )}
                      {activity.geometry?.length > 0 && <p className="text-[8px] text-gray-400">{activity.geometry.length} boundary points recorded</p>}
                      {activity.alert_generated && <p className="text-[9px] text-rose-500 mt-1">⚠ Alert generated</p>}
                    </div>
                  </Popup>
                </Polygon>
              ) : null
            )}

            {/* Selected activity vertex markers — show exact recorded boundary points */}
            {selectedActivity?.id && showBoundaries && selectedActivity.geometry?.length >= 3 && (
              selectedActivity.geometry.map((pt, i) => (
                <Marker key={`sel-vertex-${i}`} position={[pt.lat, pt.lng]} icon={vertexIcon}>
                  <Popup><div className="p-1 text-xs"><p className="font-semibold">Boundary Point {i + 1}</p><p className="text-gray-500">{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</p></div></Popup>
                </Marker>
              ))
            )}

            {/* Drawing: open polyline */}
            {drawMode && drawPoints.length > 0 && (
              <Polyline
                positions={drawPoints.map(p => [p.lat, p.lng])}
                pathOptions={{ color: '#22c55e', weight: 2, dashArray: '5 5' }}
              />
            )}

            {/* Drawing: closed polygon */}
            {drawFinished && drawPoints.length >= 3 && (
              <Polygon
                positions={drawPoints.map(p => [p.lat, p.lng])}
                pathOptions={{ color: '#22c55e', weight: 2, fillColor: '#22c55e', fillOpacity: 0.15 }}
              />
            )}

            {/* Drawing vertex markers */}
            {drawPoints.map((pt, i) => (
              <Marker key={`vertex-${i}`} position={[pt.lat, pt.lng]} icon={vertexIcon}>
                <Popup><div className="p-1 text-xs">Point {i + 1}<br />{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</div></Popup>
              </Marker>
            ))}

            {/* GPS marker */}
            {gps && !gps.error && (
              <Marker position={[gps.lat, gps.lng]} icon={gpsIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <p className="font-semibold flex items-center gap-1"><Navigation className="h-3 w-3" /> GPS Location</p>
                    <p className="text-gray-500">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
                    {gps.accuracy && <p className="text-gray-400">Accuracy: ±{Math.round(gps.accuracy)}m</p>}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* AI analysis point marker */}
            {clickedPoint && (
              <Marker
                position={[clickedPoint.lat, clickedPoint.lng]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(199,89%,48%);border:3px solid white;box-shadow:0 0 0 3px rgba(14,165,233,0.3),0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:white;"></div></div>`,
                  iconSize: [28, 28], iconAnchor: [14, 14],
                })}
              >
                <Popup><div className="p-1 text-xs"><p className="font-semibold">Analysis Point</p><p className="text-gray-500">{clickedPoint.lat.toFixed(5)}, {clickedPoint.lng.toFixed(5)}</p></div></Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Data Source Badge */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium shadow-lg backdrop-blur-sm border",
              gibsError
                ? "bg-amber-500/90 text-white border-amber-400"
                : "bg-card/90 text-foreground border-border"
            )}>
              {gibsError ? (
                <>
                  <Satellite className="h-3 w-3" />
                  Copernicus Sentinel-2 (fallback)
                </>
              ) : overlayType === 'satellite' || overlayType === 'street' ? (
                <>
                  <Globe className="h-3 w-3" />
                  {overlayType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap'}
                </>
              ) : (
                <>
                  <Satellite className="h-3 w-3" />
                  NASA GIBS · {OVERLAYS.find(o => o.value === overlayType)?.label}
                </>
              )}
            </div>
            {gibsError && (
              <div className="bg-card/90 text-[9px] text-muted-foreground px-2.5 py-1 rounded-lg shadow-lg backdrop-blur-sm border border-border max-w-[200px]">
                NASA layer unavailable for this date. Showing satellite base imagery. Analysis still uses Copernicus Sentinel-2 data.
              </div>
            )}
          </div>

          {/* Legend — layer-specific satellite guidelines */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-border text-xs space-y-2.5 hidden sm:block" style={{ maxWidth: '210px' }}>
            {/* Active satellite layer guide */}
            {(() => {
              const guide = LAYER_GUIDES[overlayType] || LAYER_GUIDES.satellite;
              return (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Satellite className="h-3 w-3 text-primary shrink-0" />
                    <p className="font-semibold text-[11px] leading-tight">{guide.title}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-1.5 leading-snug">{guide.desc}</p>
                  {guide.items.length > 0 && (
                    <div className="space-y-1">
                      {guide.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {item.color === 'transparent' ? (
                            <span className="h-2.5 w-2.5 rounded-sm shrink-0 border border-muted-foreground/40" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, hsl(var(--muted)) 2px, hsl(var(--muted)) 4px)' }} />
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                          )}
                          <span className="text-[9px] leading-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Report markers */}
            <div className="border-t border-border pt-2">
              <p className="font-semibold text-[10px] mb-1">Report Markers</p>
              <div className="space-y-1">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                    <span className="text-[9px]">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monitoring boundaries */}
            {showBoundaries && monitoringActivities.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="font-semibold text-[10px] mb-1">Monitoring Zones</p>
                <div className="space-y-1">
                  {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: v }} />
                      <span className="text-[9px] capitalize">{k.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile compact drawing toolbar — visible when drawMode active on mobile */}
          {drawMode && (
            <div className="md:hidden absolute bottom-4 left-3 right-3 z-[2000] bg-card/95 backdrop-blur-md rounded-xl shadow-2xl border border-border p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary shrink-0">
                  <Ruler className="h-3.5 w-3.5" />
                  <span>Drawing</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{drawPoints.length} pts</Badge>
                </div>
                <div className="flex gap-1.5 ml-auto">
                  <Button size="sm" variant="outline" className="h-8 px-2.5 gap-1" onClick={handleUndoPoint} disabled={drawPoints.length === 0}>
                    <Undo2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Undo</span>
                  </Button>
                  <Button size="sm" className="h-8 px-2.5 gap-1 bg-brand-gradient" onClick={handleFinishDrawing} disabled={drawPoints.length < 3}>
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span className="text-xs">Finish</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleClearDrawing}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Collapsible Panel — top-positioned, minimizable, keeps map visible */}
        {mobilePanelOpen && !drawMode && (
          <div className="md:hidden absolute top-0 left-0 right-0 z-[2000] bg-card rounded-b-2xl shadow-2xl border-b border-border flex flex-col" style={{ maxHeight: mobilePanelExpanded ? '45vh' : 'none' }}>
            {mobilePanelExpanded ? (
              <>
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    {mode === 'creating' ? <Plus className="h-4 w-4 text-primary" /> : mode === 'results' ? <CheckCircle className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-primary" />}
                    {mode === 'creating' ? 'New Activity' : mode === 'results' ? 'Results' : 'Live Monitoring'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setMobilePanelExpanded(false)}>
                      <ChevronDown className="h-3.5 w-3.5" /> Minimize
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setMobilePanelOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {renderSidebarContent(() => setMobilePanelOpen(false))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-thin">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={() => setMobilePanelExpanded(true)}>
                  <ChevronUp className="h-3.5 w-3.5" /> Expand
                </Button>
                {mode === 'view' && (
                  <Button size="sm" className="h-7 text-xs gap-1 shrink-0 bg-brand-gradient" onClick={handleNewActivity}>
                    <Plus className="h-3 w-3" /> New
                  </Button>
                )}
                {mode === 'creating' && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={handleCancel}>
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                )}
                <Button size="sm" variant={clickMode ? "default" : "outline"} className="h-7 text-xs gap-1 shrink-0" onClick={toggleClickMode}>
                  <Brain className="h-3 w-3" /> AI
                </Button>
                <Button size="sm" variant={mobileTab === 'monitoring' ? "default" : "outline"} className="h-7 text-xs gap-1 shrink-0" onClick={() => { setMobileTab('monitoring'); setMobilePanelExpanded(true); }}>
                  <Activity className="h-3 w-3" /> History ({monitoringActivities.length})
                </Button>
                <Button size="sm" variant={mobileTab === 'reports' ? "default" : "outline"} className="h-7 text-xs gap-1 shrink-0" onClick={() => { setMobileTab('reports'); setMobilePanelExpanded(true); }}>
                  <FileText className="h-3 w-3" /> Reports
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0 ml-auto" onClick={() => setMobilePanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes ping { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.8); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }`}</style>
    </div>
  );
}