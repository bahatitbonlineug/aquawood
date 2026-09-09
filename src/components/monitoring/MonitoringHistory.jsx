import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TreeDeciduous, Droplets, Wheat, Sprout, Fish, Bird, Globe,
  MapPin, Calendar, AlertTriangle, CheckCircle, Ruler, Search,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatArea } from '@/lib/geoUtils';
import moment from 'moment';

const CATEGORY_CONFIG = {
  forest: { label: 'Forest', icon: TreeDeciduous, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  wetland: { label: 'Wetland', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  agriculture: { label: 'Agriculture', icon: Wheat, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  tree_plantation: { label: 'Tree Plantation', icon: Sprout, color: 'text-green-500', bg: 'bg-green-500/10' },
  water_body: { label: 'Water Body', icon: Fish, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  wildlife: { label: 'Wildlife', icon: Bird, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  environmental_monitoring: { label: 'Environmental', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

function ndviColor(val) {
  if (val == null) return 'text-muted-foreground';
  if (val > 0.5) return 'text-emerald-500';
  if (val > 0.3) return 'text-amber-500';
  return 'text-rose-500';
}

export default function MonitoringHistory({ activities, onSelectActivity, selectedId }) {
  const [search, setSearch] = useState('');

  const filtered = activities.filter(a =>
    a.activity_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.district?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="flex-1 min-h-0 flex flex-col">
      <CardHeader className="p-3 pb-2 shrink-0">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Monitoring History ({activities.length})</span>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No monitoring activities yet</p>
              <p className="text-[10px] mt-1">Click "New Activity" to start</p>
            </div>
          ) : (
            <div className="px-3 pb-3 space-y-1.5">
              {filtered.map(activity => {
                const cat = CATEGORY_CONFIG[activity.category] || CATEGORY_CONFIG.environmental_monitoring;
                const CatIcon = cat.icon;
                const isSelected = selectedId === activity.id;
                return (
                  <button
                    key={activity.id}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg transition-colors border',
                      isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-secondary'
                    )}
                    onClick={() => onSelectActivity?.(activity)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn('p-1.5 rounded-lg shrink-0', cat.bg)}>
                        <CatIcon className={cn('h-3.5 w-3.5', cat.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{activity.activity_name}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={cn('text-[10px]', cat.color)}>{cat.label}</span>
                          {activity.district && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {activity.district}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {activity.ndvi != null && (
                            <span className={cn('text-[10px] font-medium', ndviColor(activity.ndvi))}>
                              NDVI {activity.ndvi.toFixed(2)}
                            </span>
                          )}
                          {activity.area_sqm != null && activity.area_sqm > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Ruler className="h-2.5 w-2.5" />
                              {formatArea(activity.area_sqm)}
                            </span>
                          )}
                          {activity.alert_generated && (
                            <span className="text-[10px] text-rose-500 flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Alert
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {moment(activity.monitoring_date || activity.created_date).format('MMM D, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}