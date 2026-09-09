import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TreeDeciduous,
  Droplets,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn } from "@/lib/utils";
import moment from 'moment';

export default function Analytics() {
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]);
  const [satLogs, setSatLogs] = useState([]);
  const [monitoringActivities, setMonitoringActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsData, zonesData, satData, monData, alertsData] = await Promise.all([
        base44.entities.Report.list('-created_date', 500),
        base44.entities.MonitoringZone.list(),
        base44.entities.SatelliteMonitoringLog.list('-logged_at', 500).catch(() => []),
        base44.entities.MonitoringActivity.list('-monitoring_date', 500).catch(() => []),
        base44.entities.Alert.list('-created_date', 100).catch(() => []),
      ]);
      setReports(reportsData);
      setZones(zonesData);
      setSatLogs(satData);
      setMonitoringActivities(monData);
      setAlerts(alertsData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Real trend data computed from live satellite monitoring logs and database records
  const groupByMonth = (logs, valueKey) => {
    const map = {};
    logs.forEach(l => {
      if (l[valueKey] == null || l.logged_at == null) return;
      const m = moment(l.logged_at);
      if (!m.isValid()) return;
      const key = m.format('MMM YY');
      if (!map[key]) map[key] = { month: key, values: [] };
      map[key].values.push(l[valueKey]);
    });
    return Object.values(map).slice(-6);
  };

  const forestLogs = satLogs.filter(l => l.site_name === 'Mabira Forest');
  const forestTrendData = groupByMonth(forestLogs, 'ndvi_estimate').map(d => ({
    month: d.month,
    coverage: d.values.length ? +(d.values.reduce((a, b) => a + b, 0) / d.values.length * 100).toFixed(1) : 0,
    deforestation: forestLogs.filter(l => {
      const lm = moment(l.logged_at);
      return lm.isValid() && lm.format('MMM YY') === d.month && (l.deforestation_risk === 'high' || l.deforestation_risk === 'critical');
    }).length,
  }));

  const lakeLogs = satLogs.filter(l => l.site_name === 'Lake Victoria');
  const waterQualityTrendData = groupByMonth(lakeLogs, 'water_quality_index').map(d => {
    const avg = d.values.length ? Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length) : 0;
    return { month: d.month, quality: avg, pollution: 100 - avg };
  });

  // Latest satellite readings for live stats
  const latestMabira = forestLogs[0];
  const latestLake = lakeLogs[0];

  // Report distributions computed from actual database records
  const typeColors = { deforestation: '#22c55e', water_pollution: '#3b82f6', illegal_activity: '#ef4444', wildlife: '#f59e0b', other: '#6b7280' };
  const typeLabels = { deforestation: 'Deforestation', water_pollution: 'Water Pollution', illegal_activity: 'Illegal Activity', wildlife: 'Wildlife', other: 'Other' };
  const reportsByType = Object.keys(typeLabels).map(key => ({
    name: typeLabels[key],
    value: reports.filter(r => r.type === key).length,
    color: typeColors[key],
  }));

  const statusColors = { pending: '#6b7280', investigating: '#3b82f6', resolved: '#22c55e', dismissed: '#ef4444' };
  const reportsByStatus = Object.keys(statusColors).map(key => ({
    status: key.charAt(0).toUpperCase() + key.slice(1),
    count: reports.filter(r => r.status === key).length,
    color: statusColors[key],
  }));

  // Monthly report submissions from real created_date timestamps
  const monthlyMap = {};
  reports.forEach(r => {
    if (!r.created_date) return;
    const m = moment(r.created_date);
    if (!m.isValid()) return;
    const key = m.format('MMM YY');
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, reports: 0, verified: 0 };
    monthlyMap[key].reports++;
    if (r.verified) monthlyMap[key].verified++;
  });
  const monthlyReports = Object.values(monthlyMap).slice(-6);

  // Zone health from real zone records
  const zoneHealthDistribution = [
    { name: 'Healthy', value: zones.filter(z => z.status === 'healthy').length, color: '#22c55e' },
    { name: 'At Risk', value: zones.filter(z => z.status === 'at_risk').length, color: '#f59e0b' },
    { name: 'Critical', value: zones.filter(z => z.status === 'critical').length, color: '#ef4444' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatBox = ({ title, value, change, changeType, icon: Icon, color }) => (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className={cn(
              "flex items-center gap-1 mt-2 text-sm",
              changeType === 'positive' ? 'text-green-500' : 'text-red-500'
            )}>
              {changeType === 'positive' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{change}</span>
            </div>
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">Analytics & Insights
            <span className="inline-flex items-center gap-1 text-xs font-normal bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          </h1>
          <p className="text-muted-foreground">Comprehensive environmental data analysis</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          title="Forest Coverage"
          value={latestMabira?.ndvi_estimate != null ? (latestMabira.ndvi_estimate * 100).toFixed(1) + '%' : '—'}
          change={forestTrendData.length >= 2 ? (forestTrendData[forestTrendData.length-1].coverage - forestTrendData[0].coverage).toFixed(1) + '% over period' : 'Live NDVI data'}
          changeType={forestTrendData.length >= 2 && forestTrendData[forestTrendData.length-1].coverage >= forestTrendData[0].coverage ? 'positive' : 'negative'}
          icon={TreeDeciduous}
          color="bg-green-500"
        />
        <StatBox
          title="Water Quality Index"
          value={latestLake?.water_quality_index != null ? Math.round(latestLake.water_quality_index) + '/100' : '—'}
          change={waterQualityTrendData.length >= 2 ? (waterQualityTrendData[waterQualityTrendData.length-1].quality - waterQualityTrendData[0].quality) + ' pts over period' : 'Live satellite data'}
          changeType={waterQualityTrendData.length >= 2 && waterQualityTrendData[waterQualityTrendData.length-1].quality >= waterQualityTrendData[0].quality ? 'positive' : 'negative'}
          icon={Droplets}
          color="bg-blue-500"
        />
        <StatBox
          title="Total Reports"
          value={reports.length}
          change={reports.filter(r => r.verified).length + ' verified'}
          changeType="positive"
          icon={BarChart3}
          color="bg-purple-500"
        />
        <StatBox
          title="Active Zones"
          value={zones.length}
          change={monitoringActivities.length + ' activities'}
          changeType="positive"
          icon={Activity}
          color="bg-amber-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="deforestation" className="text-xs sm:text-sm">Deforestation</TabsTrigger>
          <TabsTrigger value="water" className="text-xs sm:text-sm">Water Quality</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Forest Coverage Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreeDeciduous className="h-5 w-5 text-green-500" />
                  Forest Coverage Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forestTrendData}>
                      <defs>
                        <linearGradient id="forestGradient2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="coverage" 
                        stroke="#22c55e" 
                        fill="url(#forestGradient2)" 
                        strokeWidth={2}
                        name="Coverage %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Water Quality Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  Water Quality Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waterQualityTrendData}>
                      <defs>
                        <linearGradient id="waterGradient2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="quality" 
                        stroke="#3b82f6" 
                        fill="url(#waterGradient2)" 
                        strokeWidth={2}
                        name="Quality Index"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Reports by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reports by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {reportsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {reportsByType.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zone Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zone Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={zoneHealthDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {zoneHealthDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {zoneHealthDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="status" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {reportsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deforestation" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Forest Coverage Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forestTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="coverage" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e' }}
                        name="Coverage %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Deforestation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forestTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="deforestation" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                        name="Deforestation Rate %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="water" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Water Quality Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={waterQualityTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="quality" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                        name="Quality Index"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pollution Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waterQualityTrendData}>
                      <defs>
                        <linearGradient id="pollutionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="pollution" 
                        stroke="#ef4444" 
                        fill="url(#pollutionGradient)" 
                        strokeWidth={2}
                        name="Pollution %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReports}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="reports" 
                      fill="#6366f1" 
                      radius={[4, 4, 0, 0]}
                      name="Total Reports"
                    />
                    <Bar 
                      dataKey="verified" 
                      fill="#22c55e" 
                      radius={[4, 4, 0, 0]}
                      name="Verified Reports"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}