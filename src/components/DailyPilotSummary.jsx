/**
 * DailyPilotSummary — shows today's and historical daily monitoring stats
 * answering questions like: "how many deforestation scans today?",
 * "how many deforestation alerts?", "what districts were flagged?"
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  TreeDeciduous, Waves, AlertTriangle, Activity,
  Calendar, ChevronDown, ChevronUp, Brain, Loader2, Download
} from 'lucide-react';
import moment from 'moment';

const riskCls = {
  low: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

function RiskBadge({ level }) {
  if (!level) return null;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${riskCls[level] || 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  );
}

function exportDailyCSV(reports) {
  if (!reports.length) return;
  const headers = ['Date', 'Site', 'Total Scans', 'Deforestation Alerts', 'Highest Risk', 'Avg NDVI', 'Avg Temp °C', 'Total Rain mm', 'Avg Water Quality', 'District High Risk Count', 'Flags', 'AI Summary'];
  const rows = reports.map(r => [
    r.report_date,
    r.site_name,
    r.total_scans ?? 0,
    r.deforestation_alerts_count ?? 0,
    r.highest_risk_level || '',
    r.avg_ndvi ?? '',
    r.avg_temperature_c ?? '',
    r.total_precipitation_mm ?? '',
    r.avg_water_quality ?? '',
    r.district_high_risk_count ?? '',
    `"${(r.environmental_flags || []).join('; ')}"`,
    `"${(r.ai_daily_summary || '').replace(/"/g, "'")}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AQUAWOOD_daily_reports_${moment().format('YYYY-MM-DD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DailyPilotSummary() {
  const [reports, setReports] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DailyMonitoringReport.list('-report_date', 30);
      setReports(data);

      // Build today's summary from actual satellite logs
      const today = moment().format('YYYY-MM-DD');
      const allLogs = await base44.entities.SatelliteMonitoringLog.list('-logged_at', 200);
      const todayLogs = allLogs.filter(l => l.logged_at?.startsWith(today));
      const mabiraToday = todayLogs.filter(l => l.site_name === 'Mabira Forest');
      const victoriaToday = todayLogs.filter(l => l.site_name === 'Lake Victoria');
      const deforestationAlerts = mabiraToday.filter(l =>
        l.deforestation_risk === 'moderate' || l.deforestation_risk === 'high' || l.deforestation_risk === 'critical'
      ).length;
      const allFlagsToday = [...new Set(todayLogs.flatMap(l => l.ai_flags || []))];

      // District logs today
      const districtLogs = await base44.entities.AIDistrictLog.list('-logged_at', 50);
      const districtToday = districtLogs.filter(l => l.logged_at?.startsWith(today));
      const highRiskDistricts = districtToday.filter(l => l.risk_level === 'high' || l.risk_level === 'critical');

      setTodayStats({
        date: today,
        totalScans: todayLogs.length,
        mabiraScans: mabiraToday.length,
        victoriaScans: victoriaToday.length,
        deforestationAlerts,
        districtLogsToday: districtToday.length,
        highRiskDistrictCount: highRiskDistricts.length,
        highRiskDistrictNames: [...new Set(highRiskDistricts.map(l => l.district))],
        allFlags: allFlagsToday,
      });
    } catch (e) {
      console.error('Failed to load daily summary:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading pilot summary...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Daily Pilot Monitoring Summary</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-collected every hour · {reports.length} daily reports stored
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {reports.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8"
                onClick={() => exportDailyCSV(reports)}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Today's live stats */}
        {todayStats && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Today — {moment().format('MMMM D, YYYY')}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">Live</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox
                icon={Activity}
                label="Total Scans"
                value={todayStats.totalScans}
                sub={`${todayStats.mabiraScans} forest · ${todayStats.victoriaScans} lake`}
                color="text-primary"
              />
              <StatBox
                icon={TreeDeciduous}
                label="Deforestation Alerts"
                value={todayStats.deforestationAlerts}
                sub={todayStats.deforestationAlerts > 0 ? 'moderate/high/critical risk' : 'All low risk'}
                color={todayStats.deforestationAlerts > 0 ? 'text-orange-600' : 'text-green-600'}
              />
              <StatBox
                icon={Brain}
                label="District Logs"
                value={todayStats.districtLogsToday}
                sub={`${todayStats.highRiskDistrictCount} high/critical`}
                color="text-blue-600"
              />
              <StatBox
                icon={AlertTriangle}
                label="High Risk Districts"
                value={todayStats.highRiskDistrictCount}
                sub={todayStats.highRiskDistrictNames.slice(0, 2).join(', ') || 'None today'}
                color={todayStats.highRiskDistrictCount > 0 ? 'text-red-600' : 'text-green-600'}
              />
            </div>
            {todayStats.allFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">Today's flags:</span>
                {todayStats.allFlags.map((flag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Historical daily reports table */}
        {expanded && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground pt-1">
              <Calendar className="h-4 w-4" /> Historical Daily Reports
            </div>
            {reports.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No daily reports yet. They compile automatically as hourly scans accumulate.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Site</TableHead>
                      <TableHead className="text-xs">Scans</TableHead>
                      <TableHead className="text-xs">Deforest. Alerts</TableHead>
                      <TableHead className="text-xs">Highest Risk</TableHead>
                      <TableHead className="text-xs">Avg NDVI</TableHead>
                      <TableHead className="text-xs">Districts At Risk</TableHead>
                      <TableHead className="text-xs">AI Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/10">
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {moment(r.report_date).format('MMM D, YYYY')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="flex items-center gap-1">
                            {r.site_name === 'Mabira Forest'
                              ? <TreeDeciduous className="h-3.5 w-3.5 text-green-600" />
                              : <Waves className="h-3.5 w-3.5 text-blue-500" />}
                            {r.site_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{r.total_scans ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          <span className={r.deforestation_alerts_count > 0 ? 'font-bold text-orange-600' : 'text-muted-foreground'}>
                            {r.deforestation_alerts_count ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell><RiskBadge level={r.highest_risk_level} /></TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.avg_ndvi != null ? r.avg_ndvi.toFixed(3) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={r.district_high_risk_count > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                            {r.district_high_risk_count ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px]">
                          <span className="line-clamp-2 text-muted-foreground">{r.ai_daily_summary || '—'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {!expanded && reports.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-xs text-primary hover:underline text-center py-1"
          >
            View {reports.length} historical daily reports ↓
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ icon: Icon, label, value, sub, color = 'text-foreground' }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] font-medium text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}