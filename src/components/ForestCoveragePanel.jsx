import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Circle, Polygon, Popup, Marker } from 'react-leaflet';
import { TreeDeciduous, Waves, Ruler, MapPin, TrendingDown, Loader2, Info } from 'lucide-react';
import moment from 'moment';
import L from 'leaflet';

// Known monitored forest/water sites with REAL area data
const MONITORED_SITES = [
  {
    name: 'Mabira Forest',
    type: 'forest',
    lat: 0.4167, lng: 32.9833,
    area_ha: 30600, // 306 km² = 30,600 ha
    description: 'Central Uganda tropical rainforest',
    districts: 'Mukono, Buikwe, Jinja',
    status: 'monitored',
    color: '#16a34a',
    radius: 9800, // meters (approximate radius for 306 km²)
  },
  {
    name: 'Lake Victoria (Uganda portion)',
    type: 'water',
    lat: -0.15, lng: 33.0,
    area_ha: 2680000, // ~26,800 km² Uganda portion = 2,680,000 ha
    description: "Uganda's portion of Lake Victoria",
    districts: 'Multiple lakeshore districts',
    status: 'monitored',
    color: '#2563eb',
    radius: 90000,
  },
  {
    name: 'Budongo Forest',
    type: 'forest',
    lat: 1.7500, lng: 31.5500,
    area_ha: 79300, // 793 km²
    description: 'Largest mahogany forest in East/Central Africa',
    districts: 'Masindi, Buliisa',
    status: 'partial',
    color: '#15803d',
    radius: 15900,
  },
  {
    name: 'Bwindi Impenetrable Forest',
    type: 'forest',
    lat: -1.0500, lng: 29.7000,
    area_ha: 32100, // 321 km²
    description: 'UNESCO World Heritage — Mountain gorilla habitat',
    districts: 'Kanungu, Kabale, Kisoro, Rukungiri',
    status: 'partial',
    color: '#166534',
    radius: 10100,
  },
  {
    name: 'Queen Elizabeth National Park',
    type: 'forest',
    lat: -0.1333, lng: 29.9167,
    area_ha: 197800, // 1978 km²
    description: 'Savannah & forest national park',
    districts: 'Kasese, Kamwenge, Rubirizi, Rukungiri',
    status: 'partial',
    color: '#4ade80',
    radius: 25000,
  },
  {
    name: 'Lake Albert',
    type: 'water',
    lat: 1.6800, lng: 30.9200,
    area_ha: 560000, // 5600 km² total
    description: 'Shared with DRC - key fishing basin',
    districts: 'Hoima, Buliisa, Masindi',
    status: 'partial',
    color: '#3b82f6',
    radius: 42000,
  },
];

const TOTAL_FOREST_HA = MONITORED_SITES
  .filter(s => s.type === 'forest')
  .reduce((sum, s) => sum + s.area_ha, 0);

const TOTAL_WATER_HA = MONITORED_SITES
  .filter(s => s.type === 'water')
  .reduce((sum, s) => sum + s.area_ha, 0);

const FULLY_MONITORED_HA = MONITORED_SITES
  .filter(s => s.status === 'monitored')
  .reduce((sum, s) => sum + s.area_ha, 0);

function formatHa(ha) {
  if (ha >= 1000000) return `${(ha / 1000000).toFixed(2)}M ha`;
  if (ha >= 1000) return `${(ha / 1000).toFixed(1)}K ha`;
  return `${ha.toLocaleString()} ha`;
}

export default function ForestCoveragePanel() {
  const [satelliteLogs, setSatelliteLogs] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [logs, zonesData] = await Promise.all([
        base44.entities.SatelliteMonitoringLog.list('-logged_at', 50),
        base44.entities.MonitoringZone.list('-created_date', 50),
      ]);
      setSatelliteLogs(logs);
      setZones(zonesData);
      setLoading(false);
    };
    load();
  }, []);

  // Latest satellite readings per site
  const latestMabira = satelliteLogs.find(l => l.site_name === 'Mabira Forest');
  const latestVictoria = satelliteLogs.find(l => l.site_name === 'Lake Victoria');

  // Add any DB monitoring zones to the map
  const dbForestZones = zones.filter(z => z.type === 'forest' && z.center);
  const dbForestHa = dbForestZones.reduce((sum, z) => sum + (z.metrics?.forest_cover || 0), 0);
  const dbNonForestZones = zones.filter(z => z.type !== 'forest' && z.center);

  const totalForestHa = TOTAL_FOREST_HA + dbForestHa;

  return (
    <Card className="border-green-200 dark:border-green-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <TreeDeciduous className="h-5 w-5 text-green-600" />
            Forest Area Monitored & Geographic Coverage
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <Info className="h-3 w-3" />
            Real area data
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Based on NEMA Uganda records, NFA data & AQUAWOOD satellite monitoring
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={TreeDeciduous}
            label="Total Forest Monitored"
            value={formatHa(totalForestHa)}
            sub={`${MONITORED_SITES.filter(s => s.type === 'forest').length} forest sites`}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-950/30"
          />
          <StatTile
            icon={Waves}
            label="Water Bodies Monitored"
            value={formatHa(TOTAL_WATER_HA)}
            sub={`${MONITORED_SITES.filter(s => s.type === 'water').length} water sites`}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <StatTile
            icon={Ruler}
            label="Full AI Coverage"
            value={formatHa(FULLY_MONITORED_HA)}
            sub="Hourly satellite scan"
            color="text-primary"
            bg="bg-primary/5"
          />
          <StatTile
            icon={MapPin}
            label="Total Sites"
            value={MONITORED_SITES.length + dbForestZones.length}
            sub={`${dbForestZones.length} from DB zones`}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
        </div>

        {/* Live Satellite Readings */}
        {(latestMabira || latestVictoria) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {latestMabira && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-green-800 dark:text-green-400 flex items-center gap-1">
                    <TreeDeciduous className="h-3 w-3" /> Mabira Forest — Live
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${
                    latestMabira.ai_risk_level === 'low' ? 'bg-green-100 text-green-700' :
                    latestMabira.ai_risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{latestMabira.ai_risk_level}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">NDVI</p>
                    <p className="text-sm font-bold text-green-700">{latestMabira.ndvi_estimate?.toFixed(2) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Deforest.</p>
                    <p className="text-sm font-bold">{latestMabira.deforestation_risk || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Area</p>
                    <p className="text-sm font-bold">30,600 ha</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{moment(latestMabira.logged_at).fromNow()}</p>
              </div>
            )}
            {latestVictoria && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-1">
                    <Waves className="h-3 w-3" /> Lake Victoria — Live
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${
                    latestVictoria.ai_risk_level === 'low' ? 'bg-green-100 text-green-700' :
                    latestVictoria.ai_risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{latestVictoria.ai_risk_level}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Water Quality</p>
                    <p className="text-sm font-bold text-blue-700">{latestVictoria.water_quality_index || '—'}/100</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">NDVI</p>
                    <p className="text-sm font-bold">{latestVictoria.ndvi_estimate?.toFixed(2) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Area (UG)</p>
                    <p className="text-sm font-bold">2.68M ha</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{moment(latestVictoria.logged_at).fromNow()}</p>
              </div>
            )}
          </div>
        )}

        {/* Geographic Coverage Map */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4 text-primary" />
            Geographic Coverage Map — Uganda
          </p>
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 380 }}>
            <MapContainer
              center={[0.8, 32.4]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* Monitored sites as circles */}
              {MONITORED_SITES.map((site) => (
                <Circle
                  key={site.name}
                  center={[site.lat, site.lng]}
                  radius={site.radius}
                  pathOptions={{
                    color: site.color,
                    fillColor: site.color,
                    fillOpacity: site.status === 'monitored' ? 0.35 : 0.15,
                    weight: site.status === 'monitored' ? 2.5 : 1.5,
                    dashArray: site.status === 'partial' ? '6 4' : undefined,
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-bold">{site.name}</p>
                      <p className="text-gray-500 text-xs">{site.description}</p>
                      <hr className="my-1" />
                      <p className="text-xs"><b>Area:</b> {site.area_ha.toLocaleString()} ha ({(site.area_ha / 100).toFixed(0)} km²)</p>
                      <p className="text-xs"><b>Districts:</b> {site.districts}</p>
                      <p className="text-xs"><b>Coverage:</b> {site.status === 'monitored' ? '✅ Full AI + Satellite' : '⚠ Partial monitoring'}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* DB Zones — all types */}
              {zones.filter(z => z.center).map((zone) => (
                <Circle
                  key={zone.id}
                  center={[zone.center.lat, zone.center.lng]}
                  radius={zone.coordinates?.length > 0 ? 8000 : 5000}
                  pathOptions={{
                    color: zone.type === 'water_body' ? '#3b82f6' : zone.type === 'wetland' ? '#06b6d4' : '#84cc16',
                    fillColor: zone.type === 'water_body' ? '#3b82f6' : zone.type === 'wetland' ? '#06b6d4' : '#84cc16',
                    fillOpacity: 0.35,
                    weight: 2
                  }}
                >
                  <Popup>
                    <p className="font-semibold text-sm">{zone.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{zone.type?.replace('_', ' ')} · {zone.status}</p>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-600 opacity-80" />
              Fully monitored (AI + Satellite)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-800 opacity-40 border border-dashed border-green-800" />
              Partial monitoring
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 opacity-50" />
              Water bodies
            </span>
          </div>
        </div>

        {/* Site breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1 text-muted-foreground font-semibold">Site</th>
                <th className="text-left py-2 px-1 text-muted-foreground font-semibold">Type</th>
                <th className="text-right py-2 px-1 text-muted-foreground font-semibold">Area (ha)</th>
                <th className="text-right py-2 px-1 text-muted-foreground font-semibold">Area (km²)</th>
                <th className="text-left py-2 px-1 text-muted-foreground font-semibold">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {MONITORED_SITES.map(site => (
                <tr key={site.name} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-1.5 px-1 font-medium">{site.name}</td>
                  <td className="py-1.5 px-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      site.type === 'forest' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {site.type === 'forest' ? 'Forest' : 'Water'}
                    </span>
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">{site.area_ha.toLocaleString()}</td>
                  <td className="py-1.5 px-1 text-right font-mono">{(site.area_ha / 100).toFixed(0)}</td>
                  <td className="py-1.5 px-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      site.status === 'monitored'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {site.status === 'monitored' ? 'Full AI' : 'Partial'}
                    </span>
                  </td>
                </tr>
              ))}
              {zones.map(zone => (
                <tr key={zone.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-1.5 px-1 font-medium">{zone.name}</td>
                  <td className="py-1.5 px-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      zone.type === 'forest' ? 'bg-green-100 text-green-700' :
                      zone.type === 'water_body' ? 'bg-blue-100 text-blue-700' :
                      zone.type === 'wetland' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{zone.type?.replace('_', ' ') || 'Zone'}</span>
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">{(zone.metrics?.forest_cover || 0).toLocaleString()}</td>
                  <td className="py-1.5 px-1 text-right font-mono text-muted-foreground">—</td>
                  <td className="py-1.5 px-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      zone.status === 'healthy' ? 'bg-green-100 text-green-700' :
                      zone.status === 'at_risk' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{zone.status || 'DB Zone'}</span>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-muted/30 font-bold">
                <td className="py-2 px-1">TOTAL FOREST</td>
                <td className="py-2 px-1 text-xs text-muted-foreground">All forests</td>
                <td className="py-2 px-1 text-right font-mono text-green-700">{totalForestHa.toLocaleString()}</td>
                <td className="py-2 px-1 text-right font-mono text-green-700">{(totalForestHa / 100).toFixed(0)}</td>
                <td className="py-2 px-1" />
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Sources: National Forestry Authority (NFA) Uganda · NEMA · Uganda Bureau of Statistics · Open-Meteo Satellite API
        </p>
      </CardContent>
    </Card>
  );
}

function StatTile({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={`rounded-xl p-3 ${bg} border border-border`}>
      <Icon className={`h-4 w-4 ${color} mb-1`} />
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}