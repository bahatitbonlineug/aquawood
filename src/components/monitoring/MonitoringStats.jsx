import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity, Calendar, AlertTriangle, TreeDeciduous, Droplets, Flame, Waves,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-muted/40 rounded-xl p-3 text-center">
      <Icon className={cn('h-5 w-5 mx-auto mb-1', color || 'text-primary')} />
      <p className={cn('text-xl font-bold', color || 'text-foreground')}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function MonitoringStats({ activities, alerts }) {
  const total = activities.length;
  const today = moment().format('YYYY-MM-DD');
  const todayCount = activities.filter(a =>
    moment(a.monitoring_date || a.created_date).format('YYYY-MM-DD') === today
  ).length;
  const activeCount = activities.filter(a => a.status === 'active').length;

  const activeAlerts = alerts.filter(a => !a.is_read);
  const highPriority = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');

  const forestCount = activities.filter(a => a.category === 'forest' || a.category === 'tree_plantation').length;
  const wetlandCount = activities.filter(a => a.category === 'wetland').length;
  const floodCount = activities.filter(a => a.flood_risk === 'high' || a.flood_risk === 'critical').length;
  const fireCount = activities.filter(a => a.fire_risk === 'high' || a.fire_risk === 'critical').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          Live Monitoring Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Activity} label="Total Activities" value={total} color="text-primary" />
          <StatTile icon={Activity} label="Active Sessions" value={activeCount} color="text-emerald-500" />
          <StatTile icon={Calendar} label="Today's Activities" value={todayCount} color="text-accent" />
          <StatTile icon={AlertTriangle} label="Active Alerts" value={activeAlerts.length} color="text-orange-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <StatTile icon={AlertTriangle} label="High Priority" value={highPriority.length} color="text-rose-500" />
          <StatTile icon={TreeDeciduous} label="Forest Monitoring" value={forestCount} color="text-green-500" />
          <StatTile icon={Droplets} label="Wetland Monitoring" value={wetlandCount} color="text-cyan-500" />
          <StatTile icon={Flame} label="Fire Risk" value={fireCount} color="text-orange-600" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <StatTile icon={Waves} label="Flood Risk" value={floodCount} color="text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
}