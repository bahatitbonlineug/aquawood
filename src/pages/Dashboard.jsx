import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TreeDeciduous, Droplets, AlertTriangle, FileText, Map } from 'lucide-react';
import moment from 'moment';

import KpiCard from '@/components/dashboard/KpiCard';
import LiveMonitoringMap from '@/components/dashboard/LiveMonitoringMap';
import DataMetricsRow from '@/components/dashboard/DataMetricsRow';
import AiAssistantWidget from '@/components/dashboard/AiAssistantWidget';
import SatelliteActivityDonut from '@/components/dashboard/SatelliteActivityDonut';
import RecentAlertsList from '@/components/dashboard/RecentAlertsList';
import RecentReportsList from '@/components/dashboard/RecentReportsList';
import WeatherWidget from '@/components/WeatherWidget';
import AdminReportDetail from '@/components/AdminReportDetail';
import MonitoringStats from '@/components/monitoring/MonitoringStats';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [satLogs, setSatLogs] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [monitoringActivities, setMonitoringActivities] = useState([]);
  const [mapCenter] = useState([0.3476, 32.5825]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me().catch(() => null);
      setUser(userData);
      const isAdmin = userData?.role === 'admin';
      const userId = userData?.id;

      const [reportsData, alertsData, zonesData, aiData, satData, monData] = await Promise.all([
        isAdmin
          ? base44.entities.Report.list('-created_date', 50)
          : base44.entities.Report.filter({ created_by_id: userId }, '-created_date', 50).catch(() => []),
        base44.entities.Alert.list('-created_date', 50).catch(() => []),
        base44.entities.MonitoringZone.list('-created_date', 10).catch(() => []),
        base44.entities.AIDistrictLog.list('-logged_at', 20).catch(() => []),
        base44.entities.SatelliteMonitoringLog.list('-logged_at', 100).catch(() => []),
        isAdmin
          ? base44.entities.MonitoringActivity.list('-monitoring_date', 200)
          : base44.entities.MonitoringActivity.filter({ created_by_id: userId }, '-monitoring_date', 200).catch(() => []),
      ]);
      setReports(reportsData);
      setAlerts(alertsData);
      setZones(zonesData);
      setAiLogs(aiData);
      setSatLogs(satData);
      setMonitoringActivities(monData);

      // Latest Kampala weather for rainfall metric
      try {
        const today = moment().format('YYYY-MM-DD');
        const w = await base44.entities.WeatherData.filter({ date: today, district: 'Kampala' });
        if (w.length > 0) setWeather(w[0]);
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Real metrics derived from data
  const STATIC_SITE_COUNT = 6;
  const latestMabira = satLogs.find(l => l.site_name === 'Mabira Forest');
  const latestLake = satLogs.find(l => l.site_name === 'Lake Victoria');
  const ndvi = latestMabira?.ndvi_estimate ?? null;
  const waterQuality = latestLake?.water_quality_index ?? null;
  const rainfall = weather?.precipitation_mm ?? null;

  // Real NDVI trend from satellite monitoring logs
  const satLogsByMonth = {};
  satLogs.filter(l => l.site_name === 'Mabira Forest' && l.ndvi_estimate != null).forEach(l => {
    const m = moment(l.logged_at);
    if (!m.isValid()) return;
    const key = m.format('MMM');
    if (!satLogsByMonth[key]) satLogsByMonth[key] = { month: key, values: [] };
    satLogsByMonth[key].values.push(l.ndvi_estimate * 100);
  });
  const deforestationTrend = Object.values(satLogsByMonth).map(d => ({
    month: d.month,
    coverage: +(d.values.reduce((a, b) => a + b, 0) / d.values.length).toFixed(1),
  })).slice(-6);

  const totalZoneForest = zones.reduce((s, z) => s + (z.metrics?.forest_cover || 0), 0);
  const carbonStock = totalZoneForest > 0 ? totalZoneForest.toFixed(0) + ' Mt' : '—';

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <KpiCard title="Forest Cover" value={ndvi != null ? (ndvi * 100).toFixed(1) + '%' : '—'} sub={ndvi != null ? 'Live NDVI · Mabira' : 'No sat data'} icon={TreeDeciduous} accent="emerald" trend={deforestationTrend.length >= 2 ? Math.abs(deforestationTrend[deforestationTrend.length-1].coverage - deforestationTrend[0].coverage).toFixed(1) + '%' : ''} trendDir="down" />
        <KpiCard title="Water Bodies" value="3.24M" sub="hectares" icon={Droplets} accent="sky" />
        <KpiCard title="AI Alerts" value={alerts.length} sub={`${alerts.filter(a => a.severity === 'critical').length} critical`} icon={AlertTriangle} accent="orange" />
        <KpiCard title="Reports Submitted" value={reports.length} sub={`${reports.filter(r => r.location?.lat).length} with GPS`} icon={FileText} accent="violet" />
        <KpiCard title="Monitoring Zones" value={STATIC_SITE_COUNT + zones.length} sub={`${STATIC_SITE_COUNT} built-in + ${zones.length} custom`} icon={Map} accent="rose" />
      </div>

      {/* Live Monitoring Statistics */}
      <MonitoringStats activities={monitoringActivities} alerts={alerts} />

      {/* Map + AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <LiveMonitoringMap reports={reports} zones={zones} mapCenter={mapCenter} />
        </div>
        <div className="space-y-4 lg:space-y-6">
          <WeatherWidget />
          <AiAssistantWidget aiLogs={aiLogs} />
        </div>
      </div>

      {/* Data Metrics Row */}
      <DataMetricsRow
        ndvi={ndvi}
        waterQuality={waterQuality}
        rainfall={rainfall}
        deforestationTrend={deforestationTrend}
        carbonStock={carbonStock}
      />

      {/* Bottom section: Alerts + Reports + Satellite Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <RecentAlertsList alerts={alerts} />
        <RecentReportsList
          reports={reports}
          onSelect={setSelectedReport}
          isAdmin={user?.role === 'admin'}
        />
        <SatelliteActivityDonut logs={satLogs} />
      </div>

      {selectedReport && user?.role === 'admin' && (
        <AdminReportDetail
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={async (id, status) => {
            await base44.entities.Report.update(id, { status });
            setSelectedReport(null);
            loadData();
          }}
          onVerify={async (id, verified) => {
            await base44.entities.Report.update(id, { verified });
            setSelectedReport(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}