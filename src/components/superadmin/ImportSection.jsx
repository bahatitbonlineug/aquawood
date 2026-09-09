import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Upload, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';
import { parseExcelFile } from '@/lib/excelUtils';
import { toast } from 'sonner';

export default function ImportSection({ entity, currentCount, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (selectedFile) => {
    setFile(selectedFile);
    setPreview(null);
    if (!selectedFile) return;
    setParsing(true);
    try {
      const parsed = await parseExcelFile(selectedFile);
      setPreview(parsed);
    } catch (e) {
      toast.error('Failed to parse Excel file');
    }
    setParsing(false);
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      await onImport(preview);
      setFile(null);
      setPreview(null);
    } catch (e) {
      toast.error('Import failed: ' + (e.message || 'Unknown error'));
    }
    setImporting(false);
    setConfirmOpen(false);
  };

  if (!entity?.canImport) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-400">Export Only:</span>{' '}
          {entity?.label} records are managed by the platform authentication system and cannot be imported.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
      <div>
        <p className="font-medium text-sm text-foreground">Import & Overwrite from Excel</p>
        <p className="text-xs text-muted-foreground">Upload an Excel file to replace all existing records. A backup is auto-downloaded first.</p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to select an Excel file (.xlsx, .xls, .csv)</span>
          </div>
        )}
      </div>

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing file...
        </div>
      )}

      {preview !== null && !parsing && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm">
              <strong className="text-foreground">{preview.length}</strong> records will replace{' '}
              <strong className="text-foreground">{currentCount}</strong> existing records
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={preview.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            Overwrite Database
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Database Overwrite
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all <strong>{currentCount}</strong> existing records in{' '}
              <strong>{entity?.label}</strong> and replace them with <strong>{preview?.length}</strong> records
              from your Excel file. A backup of the current data will be downloaded automatically.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              disabled={importing}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Overwriting...</>
              ) : (
                'Yes, Overwrite Everything'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}