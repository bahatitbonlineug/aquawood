import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Gauge from './Gauge';
import { cn } from "@/lib/utils";
import { Leaf, Droplets, CloudRain, TreeDeciduous, Activity } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

function MetricCard({ title, icon: Icon, iconColor, children }) {
  return (
    <Card className="card-modern border-border">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function DataMetricsRow({ ndvi, waterQuality, rainfall, deforestationTrend, carbonStock }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <MetricCard title="Forest Health (NDVI)" icon={Leaf} iconColor="text-emerald-500">
        <Gauge value={ndvi ?? 0} max={1} unit="" color="#059669" label={ndvi != null ? `${(ndvi*100).toFixed(0)}% vegetation` : 'No data'} footer="Mabira latest scan" />
      </MetricCard>

      <MetricCard title="Water Quality Index" icon={Droplets} iconColor="text-sky-500">
        <Gauge value={waterQuality ?? 0} max={100} unit="/100" color="#0ea5e9" label={waterQuality != null ? 'Lake Victoria' : 'No data'} footer="Satellite estimate" />
      </MetricCard>

      <MetricCard title="Rainfall (today)" icon={CloudRain} iconColor="text-blue-400">
        <div className="flex flex-col items-center justify-center h-[120px]">
          <p className="text-3xl font-bold font-display text-foreground">{rainfall != null ? rainfall.toFixed(1) : '—'}<span className="text-base text-muted-foreground ml-0.5">mm</span></p>
          <p className="text-xs text-muted-foreground mt-1">Kampala · Open-Meteo</p>
        </div>
      </MetricCard>

      <MetricCard title="Deforestation Trend" icon={Activity} iconColor="text-rose-500">
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={deforestationTrend} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="deforG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }} />
              <Area type="monotone" dataKey="coverage" stroke="#ef4444" fill="url(#deforG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </MetricCard>

      <MetricCard title="Carbon Storage" icon={TreeDeciduous} iconColor="text-emerald-600">
        <div className="flex flex-col items-center justify-center h-[120px]">
          <TreeDeciduous className="h-10 w-10 text-emerald-500/80" />
          <p className="text-xl font-bold font-display text-foreground mt-1">{carbonStock}</p>
          <p className="text-xs text-muted-foreground">est. carbon stock</p>
        </div>
      </MetricCard>
    </div>
  );
}