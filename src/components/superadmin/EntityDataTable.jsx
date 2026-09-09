import { Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { cn } from '@/lib/utils';

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function detectType(data, key) {
  for (const row of data) {
    const v = row[key];
    if (v !== null && v !== undefined && v !== '') {
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'number') return 'number';
      if (Array.isArray(v)) return 'array';
      if (typeof v === 'object') return 'object';
      if (key.includes('date') || key.includes('_at') || /^\d{4}-\d{2}-\d{2}/.test(String(v))) return 'date';
      return 'text';
    }
  }
  return 'text';
}

const LONG_TEXT_FIELDS = [
  'description', 'analysis', 'ai_analysis', 'full_analysis', 'message', 'bio',
  'notes', 'admin_notes', 'evidence_description', 'environmental_impact',
  'risk_mitigation', 'ai_suggestion', 'weather_summary', 'satellite_indicators',
  'ai_daily_summary', 'local_treatment', 'scientific_treatment', 'location_suggestion',
  'maintenance_message', 'recommended_actions',
];

function isLongTextField(key) {
  return LONG_TEXT_FIELDS.some(f => key.includes(f));
}

function renderCell(value, type, key) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/30">—</span>;
  }
  switch (type) {
    case 'boolean':
      return (
        <Badge className={cn('text-white text-xs', value ? 'bg-emerald-500' : 'bg-gray-400')}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    case 'number':
      return <span className="font-mono tabular-nums text-foreground">{value}</span>;
    case 'date':
      try {
        return (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {moment(value).format('MMM D, YYYY · h:mm A')}
          </span>
        );
      } catch {
        return <span className="text-foreground">{String(value)}</span>;
      }
    case 'array':
    case 'object':
      return (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-w-[300px] overflow-hidden">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    default: {
      const isLong = isLongTextField(key) || String(value).length > 50;
      return (
        <span className={cn(
          'text-foreground',
          isLong ? 'whitespace-pre-wrap break-words max-w-[400px] block' : 'whitespace-nowrap'
        )}>
          {String(value)}
        </span>
      );
    }
  }
}

export default function EntityDataTable({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 border border-border rounded-xl bg-card">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-xl bg-card text-center">
        <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground text-sm">No records found in this entity</p>
      </div>
    );
  }

  const allKeys = [...new Set(data.flatMap(row => Object.keys(row)))];
  const builtinOrder = ['id', 'email', 'full_name', 'role', 'created_date', 'updated_date', 'created_by_id'];
  const sortedKeys = allKeys.sort((a, b) => {
    const ai = builtinOrder.indexOf(a);
    const bi = builtinOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const columns = sortedKeys.map(key => ({
    key,
    label: formatLabel(key),
    type: detectType(data, key),
    isLong: isLongTextField(key),
  }));

  return (
    <div className="rounded-xl border border-border overflow-auto max-h-[600px] bg-card shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-brand-gradient text-white">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-semibold border-r border-white/20 last:border-r-0',
                  col.isLong ? 'min-w-[250px]' : 'min-w-[120px] whitespace-nowrap'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={cn(
                'border-b border-border hover:bg-primary/5 transition-colors',
                i % 2 === 1 && 'bg-muted/20'
              )}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-2.5 border-r border-border last:border-r-0 align-top',
                    col.isLong ? 'max-w-[400px]' : ''
                  )}
                >
                  {renderCell(row[col.key], col.type, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}