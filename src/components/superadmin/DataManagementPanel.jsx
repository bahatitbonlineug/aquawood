import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { ENTITY_REGISTRY } from '@/lib/entityRegistry';
import { exportToExcel, exportAllToExcel } from '@/lib/excelUtils';
import EntityGrid from './EntityGrid';
import EntityDataTable from './EntityDataTable';
import ImportSection from './ImportSection';
import { toast } from 'sonner';
import moment from 'moment';

const getEntities = () => base44.entities;

export default function DataManagementPanel() {
  const [selected, setSelected] = useState(null);
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingCurrent, setExportingCurrent] = useState(false);

  useEffect(() => {
    loadAllCounts();
  }, []);

  const loadAllCounts = async () => {
    setLoadingCounts(true);
    const newCounts = {};
    const entities = getEntities();
    await Promise.allSettled(
      ENTITY_REGISTRY.map(async (e) => {
        try {
          const records = await entities[e.name].list('-created_date', 500);
          newCounts[e.name] = records.length;
        } catch {
          newCounts[e.name] = 0;
        }
      })
    );
    setCounts(newCounts);
    setLoadingCounts(false);
  };

  const handleSelectEntity = async (entity) => {
    setSelected(entity);
    setLoadingData(true);
    setData([]);
    try {
      const records = await getEntities()[entity.name].list('-created_date', 500);
      setData(records);
    } catch {
      toast.error('Failed to load data');
    }
    setLoadingData(false);
  };

  const handleBack = () => {
    setSelected(null);
    setData([]);
    loadAllCounts();
  };

  const handleRefresh = async () => {
    if (!selected) return;
    setLoadingData(true);
    try {
      const records = await getEntities()[selected.name].list('-created_date', 500);
      setData(records);
    } catch {}
    setLoadingData(false);
  };

  const handleExportCurrent = async () => {
    if (!data.length) {
      toast.error('No data to export');
      return;
    }
    setExportingCurrent(true);
    try {
      await exportToExcel(data, `AQUAWOOD_${selected.name}_${moment().format('YYYY-MM-DD')}.xlsx`, selected.name);
      toast.success(`Exported ${data.length} records`);
    } catch {
      toast.error('Export failed');
    }
    setExportingCurrent(false);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const entities = getEntities();
      const allData = {};
      for (const entity of ENTITY_REGISTRY) {
        try {
          const records = await entities[entity.name].list('-created_date', 500);
          allData[entity.name] = records;
        } catch {
          allData[entity.name] = [];
        }
      }
      await exportAllToExcel(allData, `AQUAWOOD_Backup_${moment().format('YYYY-MM-DD')}.xlsx`);
      toast.success('Full backup exported successfully');
    } catch {
      toast.error('Backup export failed');
    }
    setExportingAll(false);
  };

  const handleImport = async (records) => {
    // Auto-backup current data before overwrite
    if (data.length > 0) {
      await exportToExcel(
        data,
        `AQUAWOOD_${selected.name}_BACKUP_${moment().format('YYYY-MM-DD_HHmm')}.xlsx`,
        selected.name
      );
    }
    // Strip built-in system fields — let the platform regenerate them
    const cleanRecords = records.map(r => {
      const { id, created_date, updated_date, created_by_id, ...rest } = r;
      return rest;
    });
    // Delete all existing records
    await getEntities()[selected.name].deleteMany({});
    // Bulk create new records from Excel
    await getEntities()[selected.name].bulkCreate(cleanRecords);
    toast.success(`Imported ${cleanRecords.length} records successfully`);
    handleRefresh();
    loadAllCounts();
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <selected.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display text-foreground">{selected.label}</h2>
              <p className="text-xs text-muted-foreground">
                {data.length} records {!selected.canImport && '· Export only'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingData} className="gap-2">
              <RefreshCw className={loadingData ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportCurrent}
              disabled={!data.length || exportingCurrent}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {exportingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportingCurrent ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>

        <ImportSection entity={selected} currentCount={data.length} onImport={handleImport} />

        <EntityDataTable data={data} loading={loadingData} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold font-display text-foreground">Database Explorer</h2>
          <p className="text-sm text-muted-foreground">Select an entity to browse, export, or import data</p>
        </div>
        <Button onClick={handleExportAll} disabled={exportingAll} className="gap-2 bg-brand-gradient text-white">
          {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportingAll ? 'Building Backup...' : 'Download Full Backup'}
        </Button>
      </div>

      <EntityGrid counts={counts} loading={loadingCounts} selected={selected} onSelect={handleSelectEntity} />
    </div>
  );
}