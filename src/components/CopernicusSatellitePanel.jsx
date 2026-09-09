import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Satellite,
  MapPin,
  Cloud,
  Leaf,
  Droplets,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';
import { fetchSiteScene } from '@/lib/copernicusStac';
import { useToast } from "@/components/ui/use-toast";
import UgandaArchiveTable from '@/components/UgandaArchiveTable';

const UGANDA_SITES = [
  'Mabira Forest',
  'Lake Victoria',
  'Mount Elgon',
  'Kidepo Valley',
  'Rwenzori Mountains',
];

const SITE_TYPES = {
  'Mabira Forest': { type: 'Tropical Forest', icon: Leaf },
  'Lake Victoria': { type: 'Water Body', icon: Droplets },
  'Mount Elgon': { type: 'Mountain Forest', icon: Activity },
  'Kidepo Valley': { type: 'Savanna / Valley', icon: MapPin },
  'Rwenzori Mountains': { type: 'Alpine / Glacier', icon: Activity },
};

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  at_risk: { label: 'At Risk', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: XCircle },
};

const NDVI_COLOR = (val) => {
  if (val == null) return 'text-muted-foreground';
  if (val > 0.5) return 'text-emerald-500';
  if (val > 0.3) return 'text-amber-500';
  return 'text-rose-500';
};

// NDVI gradient position: -1 to 1 → 0% to 100%
const ndviPosition = (val) => {
  if (val == null) return 50;
  return Math.max(0, Math.min(100, ((val + 1) / 2) * 100));
};

export default function CopernicusSatellitePanel() {
  const { toast } = useToast();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScene, setSelectedScene] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadScenes = useCallback(async () => {
    try {
      const data = await base44.entities.SatelliteScene.list('-fetched_at', 50);
      setScenes(data);
    } catch (e) {
      console.error('Failed to load scenes:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Fetch REAL live data: Copernicus STAC scene metadata + NASA GIBS NDVI/NDWI
  const handleRefreshLive = async () => {
    setRefreshing(true);
    let ok = 0;
    let failed = 0;
    for (const siteName of UGANDA_SITES) {
      try {
        const sceneData = await fetchSiteScene(siteName, { days: 30, limit: 5 });
        await base44.entities.SatelliteScene.create(sceneData);
        ok++;
      } catch (e) {
        console.error(`Failed to fetch ${siteName}:`, e);
        failed++;
      }
    }
    setRefreshing(false);
    if (ok > 0) {
      toast({
        title: 'Live data fetched',
        description: `${ok} site${ok !== 1 ? 's' : ''} updated with real Sentinel-2 + MODIS data${failed > 0 ? ` (${failed} failed)` : ''}.`,
      });
      loadScenes();
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not fetch live data',
        description: 'The Copernicus catalog or NASA GIBS may be unreachable. Try again later.',
      });
    }
  };

  const latestBySite = UGANDA_SITES.map((siteName) => {
    const siteScenes = scenes.filter((s) => s.site_name === siteName);
    return { siteName, scene: siteScenes[0] || null, count: siteScenes.length };
  });

  const openDetail = (scene) => {
    setSelectedScene(scene);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading satellite data...</p>
        </div>
      </div>
    );
  }

  const totalScenes = scenes.length;
  const healthyCount = latestBySite.filter(({ scene }) => scene?.health_status === 'healthy').length;
  const avgNdvi = latestBySite.filter(({ scene }) => scene?.ndvi_mean != null).reduce((sum, { scene }) => sum + scene.ndvi_mean, 0) / (latestBySite.filter(({ scene }) => scene?.ndvi_mean != null).length || 1);

  return (
    <div className="space-y-5">
      {/* Header / Controls */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Satellite className="h-5 w-5 text-primary" />
                Copernicus Sentinel-2 Live
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Real Sentinel-2 scene metadata (Copernicus STAC) + NDVI/NDWI from NASA GIBS MODIS
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary"
                onClick={handleRefreshLive}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {refreshing ? 'Fetching...' : 'Refresh Live'}
              </Button>
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                <Database className="h-3.5 w-3.5" />
                {totalScenes} scenes
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-primary">{UGANDA_SITES.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Sites</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-emerald-500">{healthyCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Healthy</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-accent">{avgNdvi ? avgNdvi.toFixed(2) : '—'}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Avg NDVI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestBySite.map(({ siteName, scene, count }) => (
          <SiteCard
            key={siteName}
            siteName={siteName}
            scene={scene}
            sceneCount={count}
            onClick={() => scene && openDetail(scene)}
          />
        ))}
      </div>

      {/* Uganda Environmental Data Bank Table */}
      <UgandaArchiveTable />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedScene && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Satellite className="h-5 w-5 text-primary" />
                  {selectedScene.site_name}
                  {selectedScene.health_status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'ml-2 gap-1',
                        HEALTH_CONFIG[selectedScene.health_status]?.color,
                        HEALTH_CONFIG[selectedScene.health_status]?.bg
                      )}
                    >
                      {HEALTH_CONFIG[selectedScene.health_status]?.label}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <SceneDetail scene={selectedScene} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SiteCard({ siteName, scene, sceneCount, onClick }) {
  const health = scene?.health_status ? HEALTH_CONFIG[scene.health_status] : null;
  const HealthIcon = health?.icon;
  const SiteIcon = SITE_TYPES[siteName]?.icon || MapPin;
  const siteType = SITE_TYPES[siteName]?.type || 'Monitoring Site';

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-all hover:shadow-glow hover:-translate-y-0.5',
        !scene && 'opacity-70'
      )}
      onClick={onClick}
    >
      {/* NDVI gradient header */}
      <div className="relative h-32">
        {scene?.ndvi_mean != null ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {/* NDVI marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
              style={{ left: `${ndviPosition(scene.ndvi_mean)}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </div>
            <div className="absolute top-2 left-3 flex items-center gap-1.5 text-white">
              <SiteIcon className="h-4 w-4" />
              <span className="text-sm font-semibold drop-shadow">{siteName}</span>
            </div>
            {health && (
              <div className="absolute top-2 right-3 flex items-center gap-1 text-white bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">
                <HealthIcon className={cn('h-3 w-3', health.color)} />
                <span className="text-[10px] font-medium">{health.label}</span>
              </div>
            )}
            <div className="absolute bottom-2 left-3 text-white">
              <p className="text-[10px] opacity-80">{siteType}</p>
            </div>
          </>
        ) : (
          <div className="h-full bg-muted flex items-center justify-center">
            <div className="text-center">
              <Satellite className="h-7 w-7 mx-auto text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground mt-2">{siteName}</p>
              <p className="text-[10px] text-muted-foreground/70">No data yet</p>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {scene ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Leaf className={cn('h-4 w-4 mx-auto mb-0.5', NDVI_COLOR(scene.ndvi_mean))} />
                <p className={cn('text-sm font-bold', NDVI_COLOR(scene.ndvi_mean))}>
                  {scene.ndvi_mean != null ? scene.ndvi_mean.toFixed(2) : '—'}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase">NDVI</p>
              </div>
              <div>
                <Droplets className="h-4 w-4 mx-auto mb-0.5 text-info" />
                <p className="text-sm font-bold text-info">
                  {scene.ndwi_mean != null ? scene.ndwi_mean.toFixed(2) : '—'}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase">NDWI</p>
              </div>
              <div>
                <Cloud className="h-4 w-4 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-sm font-bold">
                  {scene.cloud_cover_pct != null ? `${Math.round(scene.cloud_cover_pct)}%` : '—'}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase">Cloud</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {scene.acquisition_date
                  ? moment(scene.acquisition_date).format('MMM D, YYYY')
                  : '—'}
              </span>
              <span>{sceneCount} scene{sceneCount !== 1 ? 's' : ''}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-2">
            Satellite data pending collection
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SceneDetail({ scene }) {
  const ndviVal = scene.ndvi_mean;
  const ndwiVal = scene.ndwi_mean;
  const siteType = SITE_TYPES[scene.site_name]?.type || 'Monitoring Site';

  return (
    <div className="space-y-4">
      {/* Site info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span>{siteType}</span>
      </div>

      {/* NDVI gauge */}
      <div className="bg-muted/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className={cn('h-5 w-5', NDVI_COLOR(ndviVal))} />
            <span className="font-semibold">NDVI — Vegetation Health</span>
          </div>
          <span className={cn('text-2xl font-bold', NDVI_COLOR(ndviVal))}>
            {ndviVal != null ? ndviVal.toFixed(3) : '—'}
          </span>
        </div>
        <div className="relative h-4 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 overflow-hidden">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-6 w-1.5 bg-white rounded-full shadow-lg ring-2 ring-foreground/20"
            style={{ left: `calc(${ndviPosition(ndviVal)}% - 3px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>-1 (Bare)</span>
          <span>0 (Sparse)</span>
          <span>+1 (Dense)</span>
        </div>
        {scene.ndvi_min != null && scene.ndvi_max != null && (
          <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t">
            <span className="text-muted-foreground">Range</span>
            <span className="font-medium">
              {scene.ndvi_min.toFixed(2)} – {scene.ndvi_max.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* NDWI gauge */}
      <div className="bg-muted/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-info" />
            <span className="font-semibold">NDWI — Water Content</span>
          </div>
          <span className="text-2xl font-bold text-info">
            {ndwiVal != null ? ndwiVal.toFixed(3) : '—'}
          </span>
        </div>
        <div className="relative h-4 rounded-full bg-gradient-to-r from-amber-700 via-cyan-500 to-blue-600 overflow-hidden">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-6 w-1.5 bg-white rounded-full shadow-lg ring-2 ring-foreground/20"
            style={{ left: `calc(${ndviPosition(ndwiVal)}% - 3px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>-1 (Dry)</span>
          <span>0</span>
          <span>+1 (Water)</span>
        </div>
        {scene.ndwi_min != null && scene.ndwi_max != null && (
          <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t">
            <span className="text-muted-foreground">Range</span>
            <span className="font-medium">
              {scene.ndwi_min.toFixed(2)} – {scene.ndwi_max.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
          <Cloud className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">
              {scene.cloud_cover_pct != null ? `${Math.round(scene.cloud_cover_pct)}%` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Cloud Cover</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">
              {scene.acquisition_date ? moment(scene.acquisition_date).format('MMM D, YYYY') : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Acquired</p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Collection</span>
          <span className="font-medium font-mono">{scene.collection || 'sentinel-2-l2a'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fetched</span>
          <span className="font-medium">
            {scene.fetched_at ? moment(scene.fetched_at).format('MMM D, YYYY HH:mm') : '—'}
          </span>
        </div>
        {scene.bbox && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">BBox (W,S,E,N)</span>
            <span className="font-mono">{scene.bbox.map((v) => v.toFixed(2)).join(', ')}</span>
          </div>
        )}
        {scene.raw_stats?.totalScenes != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scans in range</span>
            <span className="font-medium">{scene.raw_stats.totalScenes}</span>
          </div>
        )}
      </div>
    </div>
  );
}