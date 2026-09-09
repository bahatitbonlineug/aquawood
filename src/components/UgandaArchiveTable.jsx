import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Loader2,
  RefreshCw,
  Leaf,
  Droplets,
  Waves,
  TreeDeciduous,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { fetchUgandaDataBank } from '@/lib/ugandaArchive';
import { FEATURE_TYPE_LABELS, WATER_CLASSIFICATION_LABELS } from '@/lib/ugandaSites';
import moment from 'moment';
import * as XLSX from 'xlsx';

const TYPE_ICONS = {
  forest: Leaf,
  swamp: Droplets,
  water_body: Waves,
  national_park: TreeDeciduous,
  district: MapPin,
};

const TYPE_COLORS = {
  forest: 'text-emerald-500 bg-emerald-500/10',
  swamp: 'text-amber-600 bg-amber-500/10',
  water_body: 'text-info bg-info/10',
  national_park: 'text-emerald-600 bg-emerald-600/10',
  district: 'text-muted-foreground bg-muted',
};

const WATER_COLORS = {
  lake: 'text-info bg-info/10',
  swamp: 'text-amber-600 bg-amber-500/10',
  river: 'text-cyan-500 bg-cyan-500/10',
  wetland: 'text-teal-500 bg-teal-500/10',
  none: 'text-muted-foreground/40',
};

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  at_risk: { label: 'At Risk', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  critical: { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

const NDVI_COLOR = (val) => {
  if (val == null) return 'text-muted-foreground';
  if (val > 0.5) return 'text-emerald-500';
  if (val > 0.3) return 'text-amber-500';
  return 'text-rose-500';
};

export default function UgandaArchiveTable() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, records: 0 });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWater, setFilterWater] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const loadRecords = useCallback(async () => {
    try {
      const data = await base44.entities.UgandaEnvArchive.list('-acquisition_date', 2000);
      setRecords(data);
    } catch (e) {
      console.error('Failed to load archive:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleBuildDataBank = async () => {
    setBuilding(true);
    setProgress({ done: 0, total: 0, records: 0 });
    try {
      const { records: newRecords } = await fetchUgandaDataBank(
        (done, total, recs) => setProgress({ done, total, records: recs }),
        { months: 6, concurrency: 5 }
      );

      // Append new data to existing (never delete — building a data bank)
      const chunkSize = 100;
      for (let i = 0; i < newRecords.length; i += chunkSize) {
        await base44.entities.UgandaEnvArchive.bulkCreate(newRecords.slice(i, i + chunkSize));
      }

      toast({
        title: 'Data bank updated',
        description: `${newRecords.length} new records appended across ${progress.total} sites (6-month detailed archive).`,
      });
      loadRecords();
    } catch (e) {
      console.error('Data bank build failed:', e);
      toast({
        variant: 'destructive',
        title: 'Build failed',
        description: e.message || 'Could not fetch satellite archive data.',
      });
    }
    setBuilding(false);
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }

    // Sort chronologically (oldest first — day 1 to today)
    const sorted = [...records].sort(
      (a, b) => new Date(a.acquisition_date) - new Date(b.acquisition_date)
    );

    const headerRow = [
      'Site Name', 'Feature Type', 'Water Classification', 'Region',
      'Latitude', 'Longitude', 'Acquisition Date',
      'NDVI', 'NDWI', 'Surface Temp (°C)', 'Cloud Cover (%)',
      'Rainfall (mm)', 'Air Temp (°C)', 'Humidity (%)',
      'Water Detected', 'Health Status', 'Scene ID',
    ];

    const dataRows = sorted.map((r) => [
      r.site_name,
      FEATURE_TYPE_LABELS[r.feature_type]?.label || r.feature_type,
      WATER_CLASSIFICATION_LABELS[r.water_classification] || r.water_classification,
      r.region,
      r.latitude,
      r.longitude,
      r.acquisition_date ? moment(r.acquisition_date).format('YYYY-MM-DD') : '',
      r.ndvi ?? '',
      r.ndwi ?? '',
      r.surface_temp_c ?? '',
      r.cloud_cover_pct ?? '',
      r.rainfall_mm ?? '',
      r.temperature_c ?? '',
      r.humidity_pct ?? '',
      r.water_detected ? 'Yes' : 'No',
      r.health_status,
      r.scene_id || '',
    ]);

    const aoa = [
      ['AQUAWOOD GROUP UGANDA LIMITED'],
      ['Uganda Environmental Data Bank'],
      [`Generated: ${moment().format('MMMM D, YYYY h:mm A')}`],
      [`Total Records: ${records.length}  |  Sites: ${new Set(records.map((r) => r.site_name)).size}`],
      ['Data Sources: Copernicus Sentinel-2 STAC (scene metadata) | NASA GIBS MODIS (NDVI/NDWI/temp) | Open-Meteo Archive (daily weather)'],
      [],
      headerRow,
      ...dataRows,
      [],
      ['© AQUAWOOD Group Uganda Limited — Environmental Monitoring Division'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 38 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Uganda Env Data');
    XLSX.writeFile(
      wb,
      `AQUAWOOD_Uganda_Env_DataBank_${moment().format('YYYYMMDD')}.xlsx`
    );

    toast({ title: 'Excel exported', description: `${records.length} records with AQUAWOOD branding.` });
  };

  const regions = [...new Set(records.map((r) => r.region))].sort();

  const filtered = records.filter((r) => {
    const matchSearch = r.site_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.feature_type === filterType;
    const matchWater = filterWater === 'all' || r.water_classification === filterWater;
    const matchRegion = filterRegion === 'all' || r.region === filterRegion;
    return matchSearch && matchType && matchWater && matchRegion;
  });

  // Sort oldest first (day 1 → today)
  const sortedFiltered = [...filtered].sort(
    (a, b) => new Date(a.acquisition_date) - new Date(b.acquisition_date)
  );

  const stats = {
    total: records.length,
    sites: new Set(records.map((r) => r.site_name)).size,
    lakes: records.filter((r) => r.water_classification === 'lake').length,
    swamps: records.filter((r) => r.water_classification === 'swamp').length,
    healthy: records.filter((r) => r.health_status === 'healthy').length,
    atRisk: records.filter((r) => r.health_status === 'at_risk').length,
    critical: records.filter((r) => r.health_status === 'critical').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Uganda Environmental Data Bank
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              6-month detailed archive — daily weather + monthly satellite per site
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={records.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              size="sm"
              onClick={handleBuildDataBank}
              disabled={building}
              className="gap-1.5"
            >
              {building ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {building ? 'Building...' : 'Build Data Bank'}
            </Button>
            <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
              <Database className="h-3.5 w-3.5" />
              {stats.total}
            </Badge>
          </div>
        </div>

        {/* Progress bar during build */}
        {building && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Fetching site {progress.done}/{progress.total || '...'}
              </span>
              <span>{progress.records} records collected</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gradient rounded-full transition-all duration-500"
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-3">
          <StatBox label="Sites" value={stats.sites} className="text-primary" />
          <StatBox label="Records" value={stats.total} className="text-foreground" />
          <StatBox label="Lakes" value={stats.lakes} className="text-info" />
          <StatBox label="Swamps" value={stats.swamps} className="text-amber-600" />
          <StatBox label="Healthy" value={stats.healthy} className="text-emerald-500" />
          <StatBox label="At Risk" value={stats.atRisk} className="text-amber-500" />
          <StatBox label="Critical" value={stats.critical} className="text-rose-500" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search site name..."
              className="pl-10 h-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(FEATURE_TYPE_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterWater} onValueChange={setFilterWater}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="Water" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Water</SelectItem>
              <SelectItem value="lake">Lake</SelectItem>
              <SelectItem value="swamp">Swamp</SelectItem>
              <SelectItem value="river">River</SelectItem>
              <SelectItem value="wetland">Wetland</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRegion} onValueChange={setFilterRegion}>
            <SelectTrigger className="w-full sm:w-32 h-9">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border max-h-[500px] overflow-y-auto">
          {sortedFiltered.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No archive data yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <span className="font-semibold">Build Data Bank</span> to fetch 6 months of detailed satellite + weather data
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
                <TableRow>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Site</TableHead>
                  <TableHead className="text-xs font-semibold">Water</TableHead>
                  <TableHead className="text-xs font-semibold">Region</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-xs font-semibold">NDVI</TableHead>
                  <TableHead className="text-xs font-semibold">NDWI</TableHead>
                  <TableHead className="text-xs font-semibold">Temp</TableHead>
                  <TableHead className="text-xs font-semibold">Rain</TableHead>
                  <TableHead className="text-xs font-semibold">Hum</TableHead>
                  <TableHead className="text-xs font-semibold">Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFiltered.map((r) => {
                  const TypeIcon = TYPE_ICONS[r.feature_type] || MapPin;
                  const waterLabel = WATER_CLASSIFICATION_LABELS[r.water_classification] || '—';
                  const health = HEALTH_CONFIG[r.health_status];
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/20 text-xs">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-flex items-center justify-center h-5 w-5 rounded', TYPE_COLORS[r.feature_type])}>
                            <TypeIcon className="h-3 w-3" />
                          </span>
                          {r.site_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize', WATER_COLORS[r.water_classification])}>
                          {waterLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{r.region}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {r.acquisition_date ? moment(r.acquisition_date).format('MMM D, \'YY') : '—'}
                      </TableCell>
                      <TableCell className={cn('font-bold', NDVI_COLOR(r.ndvi))}>
                        {r.ndvi != null ? r.ndvi.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-info font-medium">
                        {r.ndwi != null ? r.ndwi.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {r.surface_temp_c != null ? `${Math.round(r.surface_temp_c)}°` : '—'}
                      </TableCell>
                      <TableCell className="text-cyan-500 whitespace-nowrap">
                        {r.rainfall_mm != null ? `${r.rainfall_mm.toFixed(1)}mm` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.humidity_pct != null ? `${Math.round(r.humidity_pct)}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded', health.color, health.bg)}>
                          {health.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Sources: Copernicus Sentinel-2 STAC (scene metadata) · NASA GIBS MODIS (NDVI/NDWI/temp) · Open-Meteo Archive (daily weather).
          Each refresh appends new records — data bank grows over time. Export includes AQUAWOOD branding.
        </p>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, className }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2 text-center">
      <p className={cn('text-lg font-bold', className)}>{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}