import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MapComponent from '@/components/MapComponent';
import { createPageUrl } from '@/utils';
import { Satellite, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const OVERLAYS = ['Satellite', 'NDVI', 'NDWI', 'SAR', 'Fire', 'Weather'];

const LEGEND = [
  { label: 'Low Risk', color: 'bg-emerald-500' },
  { label: 'Moderate', color: 'bg-amber-500' },
  { label: 'High Risk', color: 'bg-rose-500' },
  { label: 'Water Body', color: 'bg-sky-500' },
];

export default function LiveMonitoringMap({ reports, zones, mapCenter }) {
  const [active, setActive] = useState('Satellite');
  const reportsWithGPS = reports.filter(r =>
    r.location?.lat && r.location?.lng && isFinite(r.location.lat) && isFinite(r.location.lng)
  );

  return (
    <Card className="card-modern overflow-hidden border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 font-display">
            <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Satellite className="h-4 w-4 text-white" />
            </span>
            Live Monitoring Map – Uganda
          </CardTitle>
          <Link to={createPageUrl('Map')}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Full Map <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <MapComponent
            center={mapCenter}
            zoom={7}
            reports={reportsWithGPS}
            zones={zones}
            className="h-[320px] border-0 rounded-none"
            showControls={false}
          />
          {/* Overlay control pills */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-1.5 glass-card rounded-lg p-1.5 shadow-soft">
            {OVERLAYS.map(o => (
              <button
                key={o}
                onClick={() => setActive(o)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                  active === o
                    ? "bg-brand-gradient text-white shadow-glow"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {o}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] glass-card rounded-lg p-2 shadow-soft">
            <div className="flex items-center gap-3">
              {LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", l.color)} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}