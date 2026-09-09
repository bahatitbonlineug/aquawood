import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Satellite } from 'lucide-react';

// Donut showing monitoring scans split by site (real data from SatelliteMonitoringLog)
export default function SatelliteActivityDonut({ logs = [] }) {
  const bySite = logs.reduce((acc, l) => {
    const key = l.site_name || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(bySite).map(([name, value], i) => ({
    name, value, color: i === 0 ? '#059669' : i === 1 ? '#0ea5e9' : '#f97316',
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="card-modern border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Satellite className="h-4 w-4 text-white" />
          </span>
          Satellite Activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Scans by monitored site</p>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="flex items-center gap-4">
            <div className="h-[140px] w-[140px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                    {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold font-display text-foreground">{total}</span>
                <span className="text-[10px] text-muted-foreground">scans</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {data.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Satellite className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No satellite scans logged yet</p>
            <p className="text-xs mt-1">Hourly scans populate this chart</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}