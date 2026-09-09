import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Database, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const ENTITIES = [
  { name: 'Report', label: 'Reports' },
  { name: 'Alert', label: 'Alerts' },
  { name: 'MonitoringZone', label: 'Monitoring Zones' },
  { name: 'Organisation', label: 'Organisations' },
  { name: 'PlantDiagnosis', label: 'Plant Diagnoses' },
  { name: 'SatelliteMonitoringLog', label: 'Satellite Logs' },
  { name: 'AIDistrictLog', label: 'AI District Logs' },
  { name: 'WeatherData', label: 'Weather Data' },
  { name: 'ActionPlan', label: 'Action Plans' },
  { name: 'DailyMonitoringReport', label: 'Daily Reports' },
];

export default function Backup() {
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { success, message }
  const [downloadProgress, setDownloadProgress] = useState('');

  // Load user once
  if (!userLoaded) {
    base44.auth.me().then(u => { setUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }

  const isAdmin = user?.role === 'admin';

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress('Fetching data...');
    const wb = XLSX.utils.book_new();

    for (const entity of ENTITIES) {
      setDownloadProgress(`Fetching ${entity.label}...`);
      const records = await base44.entities[entity.name].list('-created_date', 5000);
      const flat = records.map(r => flattenObject(r));
      const ws = XLSX.utils.json_to_sheet(flat.length > 0 ? flat : [{}]);
      XLSX.utils.book_append_sheet(wb, ws, entity.label.slice(0, 31));
    }

    setDownloadProgress('Generating file...');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `AQUAWOOD_Backup_${date}.xlsx`);
    setDownloadProgress('');
    setDownloading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      let totalImported = 0;
      let errors = [];

      for (const entity of ENTITIES) {
        const sheetName = wb.SheetNames.find(s => s === entity.label.slice(0, 31));
        if (!sheetName) continue;
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) continue;

        for (const row of rows) {
          // Remove built-in read-only fields before upserting
          const { id, created_date, updated_date, created_by_id, ...data } = row;
          // Remove empty/undefined values
          Object.keys(data).forEach(k => { if (data[k] === undefined || data[k] === '') delete data[k]; });
          if (Object.keys(data).length === 0) continue;

          if (id) {
            await base44.entities[entity.name].update(id, data).catch(err => errors.push(`${entity.label}: ${err.message}`));
          } else {
            await base44.entities[entity.name].create(data).catch(err => errors.push(`${entity.label}: ${err.message}`));
          }
          totalImported++;
        }
      }

      setUploading(false);
      if (errors.length === 0) {
        setUploadStatus({ success: true, message: `✅ ${totalImported} records updated/created successfully.` });
      } else {
        setUploadStatus({ success: false, message: `⚠ ${totalImported} records processed. ${errors.length} error(s): ${errors.slice(0, 3).join('; ')}` });
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  if (!userLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold">Admin Only</h2>
          <p className="text-muted-foreground text-sm mt-1">Only administrators can access the backup & restore page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          Backup & Restore
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download all data as a multi-sheet Excel file, or upload a backup file to update the database.
        </p>
      </div>

      {/* Sheets included */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Data Included in Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map(e => (
              <Badge key={e.name} variant="secondary" className="text-xs">{e.label}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Each entity becomes a separate sheet. All records are exported. On upload, rows with an <b>id</b> are updated; rows without an <b>id</b> are created as new records.
          </p>
        </CardContent>
      </Card>

      {/* Download */}
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            Download Full Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Downloads all data as <b>AQUAWOOD_Backup_{new Date().toISOString().slice(0, 10)}.xlsx</b> with one sheet per entity.
          </p>
          {downloadProgress && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {downloadProgress}
            </div>
          )}
          <Button onClick={handleDownload} disabled={downloading} className="gap-2 w-full sm:w-auto">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Preparing Download...' : 'Download Excel Backup'}
          </Button>
        </CardContent>
      </Card>

      {/* Upload / Restore */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload & Restore Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a previously downloaded backup Excel file. Records with a matching <b>id</b> will be updated; new rows (no id) will be created. Existing records not in the file are left untouched.
          </p>

          {uploadStatus && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              uploadStatus.success
                ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/20'
            }`}>
              {uploadStatus.success
                ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{uploadStatus.message}</span>
            </div>
          )}

          <div>
            <label htmlFor="upload-file">
              <Button
                asChild
                variant="outline"
                disabled={uploading}
                className="gap-2 cursor-pointer w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <span>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading & Updating...' : 'Choose Excel File to Upload'}
                </span>
              </Button>
            </label>
            <input
              id="upload-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Flatten nested objects for Excel export
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const key = prefix ? `${prefix}.${k}` : k;
    const val = obj[k];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, key));
    } else if (Array.isArray(val)) {
      acc[key] = val.join(', ');
    } else {
      acc[key] = val;
    }
    return acc;
  }, {});
}