import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Leaf, Droplets, Cloud, Flame, Waves, Thermometer, Ruler, Satellite,
  Calendar, Activity, AlertTriangle, CheckCircle, MapPin,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';

const RISK_CONFIG = {
  low: { label: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  medium: { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  critical: { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

const VEG_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-emerald-500' },
  moderate: { label: 'Moderate', color: 'text-amber-500' },
  degraded: { label: 'Degraded', color: 'text-orange-500' },
  barren: { label: 'Barren', color: 'text-rose-500' },
  unknown: { label: 'Unknown', color: 'text-muted-foreground' },
};

function ndviColor(val) {
  if (val == null) return 'text-muted-foreground';
  if (val > 0.5) return 'text-emerald-500';
  if (val > 0.3) return 'text-amber-500';
  return 'text-rose-500';
}

export default function MonitoringResults({ activity, alerts }) {
  const fireRisk = RISK_CONFIG[activity.fire_risk] || RISK_CONFIG.low;
  const floodRisk = RISK_CONFIG[activity.flood_risk] || RISK_CONFIG.low;
  const veg = VEG_CONFIG[activity.vegetation_status] || VEG_CONFIG.unknown;

  return (
    <div className="space-y-3">
      {/* Satellite Provider Info */}
      <Card className="border-primary/20">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Satellite className="h-4 w-4 text-primary" />
            Satellite Data Retrieved
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Provider</p>
              <p className="font-medium">{activity.satellite_provider || '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Satellite</p>
              <p className="font-medium">{activity.satellite_name || '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Acquired</p>
              <p className="font-medium">{activity.acquisition_date ? moment(activity.acquisition_date).format('MMM D, YYYY') : '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Resolution</p>
              <p className="font-medium">{activity.spatial_resolution_m ? `${activity.spatial_resolution_m}m` : '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Cloud Cover</p>
              <p className="font-medium">{activity.cloud_percentage != null ? `${Math.round(activity.cloud_percentage)}%` : '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Land Cover</p>
              <p className="font-medium">{activity.land_cover || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Indicators */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Environmental Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          {/* NDVI */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className={cn('h-4 w-4', ndviColor(activity.ndvi))} />
              <span className="text-xs font-medium">NDVI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-bold', ndviColor(activity.ndvi))}>
                {activity.ndvi != null ? activity.ndvi.toFixed(3) : '—'}
              </span>
              <span className={cn('text-[10px]', veg.color)}>{veg.label}</span>
            </div>
          </div>

          {/* NDWI */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-info" />
              <span className="text-xs font-medium">NDWI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-info">
                {activity.ndwi != null ? activity.ndwi.toFixed(3) : '—'}
              </span>
              {activity.water_detected && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 text-info border-info/30 bg-info/10">Flood Detected</Badge>
              )}
              {activity.water_presence && !activity.water_detected && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 text-info border-info/30">Water</Badge>
              )}
            </div>
          </div>

          {/* Temperature — shows surface temp (satellite) when available, else air temp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">
                {activity.surface_temp_c != null ? 'Surface Temp (Satellite)' : 'Air Temp (Weather)'}
              </span>
            </div>
            <span className="text-sm font-bold">
              {activity.temperature_c != null ? `${activity.temperature_c.toFixed(1)}°C` : '—'}
            </span>
          </div>

          {/* Rainfall */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Rainfall (3-day)</span>
            </div>
            <span className="text-sm font-bold">
              {activity.rainfall_mm != null ? `${activity.rainfall_mm.toFixed(1)}mm` : '—'}
            </span>
          </div>

          {/* Humidity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-medium">Humidity</span>
            </div>
            <span className="text-sm font-bold">
              {activity.humidity_pct != null ? `${Math.round(activity.humidity_pct)}%` : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Risk Assessment
            <span className="text-[9px] text-muted-foreground font-normal ml-auto">Computed from satellite data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2.5">
          {/* Fire Risk — formula: f(temp, humidity, rainfall, NDVI) */}
          <div className={cn('rounded-lg p-2.5', fireRisk.bg)}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Flame className={cn('h-4 w-4', fireRisk.color)} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Fire Risk</span>
              </div>
              <p className={cn('text-sm font-bold', fireRisk.color)}>{fireRisk.label}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>Temp: <span className="font-medium text-foreground">{activity.temperature_c != null ? `${activity.temperature_c.toFixed(1)}°C` : '—'}</span></span>
              <span>Humidity: <span className="font-medium text-foreground">{activity.humidity_pct != null ? `${Math.round(activity.humidity_pct)}%` : '—'}</span></span>
              <span>Rainfall: <span className="font-medium text-foreground">{activity.rainfall_mm != null ? `${activity.rainfall_mm.toFixed(1)}mm` : '—'}</span></span>
              <span>NDVI: <span className="font-medium text-foreground">{activity.ndvi != null ? activity.ndvi.toFixed(2) : '—'}</span></span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
              Formula: T{'>'}35°C &amp; H{'<'}25% &amp; R{'<'}1mm → critical · T{'>'}30 &amp; H{'<'}35 &amp; R{'<'}2 → high · dry NDVI{'<'}0.2 upgrades risk
            </p>
          </div>

          {/* Flood Risk — formula: f(rainfall, NDWI) */}
          <div className={cn('rounded-lg p-2.5', floodRisk.bg)}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Waves className={cn('h-4 w-4', floodRisk.color)} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Flood Risk</span>
              </div>
              <p className={cn('text-sm font-bold', floodRisk.color)}>{floodRisk.label}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>Rainfall: <span className="font-medium text-foreground">{activity.rainfall_mm != null ? `${activity.rainfall_mm.toFixed(1)}mm` : '—'}</span></span>
              <span>NDWI: <span className="font-medium text-foreground">{activity.ndwi != null ? activity.ndwi.toFixed(2) : '—'}</span></span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
              Formula: R{'>'}15mm → critical · R{'>'}10 or NDWI{'>'}0.1 &amp; R{'>'}3 → high · R{'>'}5 → medium
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Generated */}
      {alerts && alerts.length > 0 && (
        <Card className="border-rose-500/30">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
              {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {alerts.map((alert, i) => {
              const cfg = RISK_CONFIG[alert.severity] || RISK_CONFIG.low;
              return (
                <div key={alert.id || i} className={cn('rounded-lg p-2.5 text-xs', cfg.bg)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{alert.title}</span>
                    <Badge variant="outline" className={cn('text-[9px] py-0 h-4', cfg.color, cfg.bg)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-snug">{alert.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(!alerts || alerts.length === 0) && (
        <Card className="border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">No alerts — all indicators within normal thresholds</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}