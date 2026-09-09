import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TreeDeciduous, Droplets, Wheat, Sprout, Fish, Bird, Globe,
  MapPin, Ruler, Crosshair, Loader2, Save, Undo2, Trash2, CheckSquare,
  Satellite, Navigation,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatArea, formatDistance } from '@/lib/geoUtils';

const CATEGORIES = [
  { value: 'forest', label: 'Forest', icon: TreeDeciduous },
  { value: 'wetland', label: 'Wetland', icon: Droplets },
  { value: 'agriculture', label: 'Agriculture', icon: Wheat },
  { value: 'tree_plantation', label: 'Tree Plantation', icon: Sprout },
  { value: 'water_body', label: 'Water Body', icon: Fish },
  { value: 'wildlife', label: 'Wildlife', icon: Bird },
  { value: 'environmental_monitoring', label: 'Environmental Monitoring', icon: Globe },
];

export default function MonitoringForm({
  form, setForm,
  gps, gpsLoading,
  drawPoints, area, perimeter, drawMode,
  onCaptureGPS, onStartDrawing, onFinishDrawing, onUndoPoint, onClearDrawing,
  onSave, saving,
}) {
  const hasPolygon = drawPoints.length >= 3;
  const canSave = form.activity_name && form.category && (hasPolygon || (gps && !gps.error));

  return (
    <div className="space-y-3">
      {/* Activity Details */}
      <Card className="border-primary/20">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            New Monitoring Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs">Activity Name</Label>
            <Input
              placeholder="e.g. Mabira North Patrol"
              value={form.activity_name}
              onChange={(e) => setForm({ ...form, activity_name: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs">Monitoring Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    <span className="flex items-center gap-2">
                      <cat.icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GPS Location */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            GPS Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {gpsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Capturing GPS location...
            </div>
          ) : gps?.error ? (
            <div className="space-y-2">
              <p className="text-xs text-rose-500">{gps.error}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onCaptureGPS}>
                <Crosshair className="h-3 w-3" />
                Retry GPS
              </Button>
            </div>
          ) : gps ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                </span>
                {gps.accuracy && (
                  <Badge variant="outline" className="text-[9px] py-0 h-4">
                    ±{Math.round(gps.accuracy)}m
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 w-full" onClick={onCaptureGPS}>
                <Crosshair className="h-3 w-3" />
                Recapture GPS
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 w-full" onClick={onCaptureGPS}>
              <Crosshair className="h-3.5 w-3.5" />
              Capture GPS Location
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Drawing Tools */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            Draw Monitoring Boundary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {!drawMode ? (
            <Button
              size="sm"
              variant={drawPoints.length > 0 ? "outline" : "default"}
              className="h-8 text-xs gap-1 w-full"
              onClick={onStartDrawing}
              disabled={!gps || gps.error}
            >
              <Ruler className="h-3.5 w-3.5" />
              {drawPoints.length > 0 ? 'Continue Drawing' : 'Start Drawing Polygon'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="bg-primary/10 text-primary text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                Click on the map to add boundary points ({drawPoints.length} points)
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={onUndoPoint} disabled={drawPoints.length === 0}>
                  <Undo2 className="h-3 w-3" />
                  Undo
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={onFinishDrawing}
                  disabled={drawPoints.length < 3}
                >
                  <CheckSquare className="h-3 w-3" />
                  Finish
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2" onClick={onClearDrawing}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Area & Perimeter */}
          {drawPoints.length >= 2 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-primary">{formatArea(area)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Area</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-accent">{formatDistance(perimeter)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Perimeter</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full gap-2 bg-brand-gradient"
        disabled={!canSave || saving}
        onClick={onSave}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Retrieving Satellite Data...
          </>
        ) : (
          <>
            <Satellite className="h-4 w-4" />
            Save & Retrieve Satellite Data
          </>
        )}
      </Button>
      {!canSave && (
        <p className="text-[10px] text-muted-foreground text-center">
          {!form.activity_name ? 'Enter activity name' :
           !form.category ? 'Select category' :
           (!gps || gps.error) && !hasPolygon ? 'Capture GPS or draw boundary' :
           'Ready to save — boundary drawing is optional'}
        </p>
      )}
    </div>
  );
}