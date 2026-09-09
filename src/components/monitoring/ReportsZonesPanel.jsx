import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  AlertTriangle, MapPin, Activity, Satellite,
  X, Search, Filter, ChevronRight, Loader2, Globe, Eye, ZoomIn,
  Save, CheckCircle, Shield, Zap, FileText, Leaf, Brain,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import moment from 'moment';

const TYPE_CONFIG = {
  deforestation: { color: '#22c55e', label: 'Deforestation' },
  water_pollution: { color: '#3b82f6', label: 'Water Pollution' },
  illegal_activity: { color: '#ef4444', label: 'Illegal Activity' },
  wildlife: { color: '#f59e0b', label: 'Wildlife' },
  other: { color: '#6b7280', label: 'Other' },
};

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', label: 'Critical' },
  high: { color: '#f97316', label: 'High' },
  medium: { color: '#eab308', label: 'Medium' },
  low: { color: '#22c55e', label: 'Low' },
};

/**
 * Reports & Zones sidebar panel — extracted from the original Map page.
 * Handles search, filter, AI analysis display, report/zone lists.
 */
export default function ReportsZonesPanel({
  searchQuery, setSearchQuery, filterType, setFilterType,
  filterSeverity, setFilterSeverity, clickMode, clickedPoint,
  analyzing, aiAnalysis, savedPlanId, savingPlan, handleSavePlan,
  setClickedPoint, setAiAnalysis, setSavedPlanId,
  validReports, filteredReports, reports, validZones, zoneColors,
  selectedReport, setSelectedReport, setMapCenter, setMapZoom,
  onItemClick,
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Search & Filter */}
      <Card className="shrink-0">
        <CardContent className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Severity</SelectItem>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Panel */}
      {(clickMode || clickedPoint) && (
        <Card className="shrink-0 border-primary/30 bg-primary/5">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
                alt="AQUA WOOD AI"
                className="h-6 w-6 rounded-full object-cover"
              />
              AQUA WOOD AI Analysis
            </CardTitle>
            {!clickedPoint && (
              <p className="text-xs text-muted-foreground">Tap anywhere on the map to analyze</p>
            )}
          </CardHeader>
          {clickedPoint && (
            <CardContent className="p-3 pt-0">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {clickedPoint.lat.toFixed(5)}, {clickedPoint.lng.toFixed(5)}
              </div>
              {analyzing ? (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Analyzing with satellite data...</span>
                </div>
              ) : aiAnalysis?.error ? (
                <p className="text-xs text-red-500 py-2">{aiAnalysis.error}</p>
              ) : aiAnalysis ? (
                <ScrollArea className="max-h-60">
                  <div className="space-y-3 pb-2">
                    {aiAnalysis.risk_level && (
                      <div className={cn("text-xs px-2 py-1 rounded-full border font-semibold inline-flex items-center gap-1",
                        aiAnalysis.risk_level === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                        aiAnalysis.risk_level === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        aiAnalysis.risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-green-100 text-green-700 border-green-200'
                      )}>
                        <AlertTriangle className="h-3 w-3" />
                        {aiAnalysis.risk_level?.toUpperCase()} RISK
                      </div>
                    )}
                    {aiAnalysis.title && <p className="text-xs font-semibold">{aiAnalysis.title}</p>}
                    {aiAnalysis.environmental_impact && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Leaf className="h-3 w-3" /> Environmental Impact
                        </p>
                        <p className="text-xs leading-relaxed">{aiAnalysis.environmental_impact}</p>
                      </div>
                    )}
                    {aiAnalysis.risk_mitigation && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Shield className="h-3 w-3" /> Risk Mitigation
                        </p>
                        <p className="text-xs leading-relaxed">{aiAnalysis.risk_mitigation}</p>
                      </div>
                    )}
                    {aiAnalysis.suggested_actions?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Zap className="h-3 w-3" /> Suggested Actions
                        </p>
                        <ul className="space-y-1">
                          {aiAnalysis.suggested_actions.slice(0, 4).map((a, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5">
                              <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">{i+1}</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : null}

              {aiAnalysis && !aiAnalysis.error && !analyzing && (
                <div className="mt-3 space-y-2">
                  {savedPlanId ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg p-2">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Plan saved for review!
                      </div>
                      <Link to={createPageUrl('ActionPlans')}>
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                          <FileText className="h-3 w-3" /> View Action Plans
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleSavePlan} disabled={savingPlan}>
                      {savingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {savingPlan ? 'Saving...' : 'Save Action Plan'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs w-full h-7"
                    onClick={() => { setClickedPoint(null); setAiAnalysis(null); setSavedPlanId(null); }}>
                    <X className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              )}
              {!analyzing && !aiAnalysis && (
                <Button size="sm" variant="ghost" className="text-xs mt-2 w-full h-7"
                  onClick={() => { setClickedPoint(null); setAiAnalysis(null); }}>
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Report List */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="p-3 pb-2 shrink-0">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>GIS Reports ({validReports.length})</span>
            {reports.length !== validReports.length && (
              <span className="text-xs font-normal text-muted-foreground">
                {reports.length - validReports.length} no GPS
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            {validZones.length > 0 && (
              <div className="px-3 pb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 pt-1">
                  Zones ({validZones.length})
                </p>
                {validZones.map(z => (
                  <button key={z.id} className="w-full text-left p-2 rounded-lg hover:bg-secondary transition-colors mb-1"
                    onClick={() => { setMapCenter([z.center.lat, z.center.lng]); onItemClick?.(); }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zoneColors[z.status] || '#22c55e' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{z.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{z.type?.replace('_', ' ')} · {z.status?.replace('_', ' ')}</p>
                      </div>
                      <ZoomIn className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Reports ({filteredReports.length})
              </p>
              {filteredReports.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No reports match filters</p>
                </div>
              ) : (
                filteredReports.map(r => {
                  const hasGPS = r.location?.lat && r.location?.lng && isFinite(r.location.lat);
                  return (
                    <button key={r.id}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg transition-colors mb-1 border",
                        selectedReport?.id === r.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-secondary"
                      )}
                      onClick={() => {
                        setSelectedReport(r);
                        if (hasGPS) { setMapCenter([r.location.lat, r.location.lng]); setMapZoom(13); }
                        onItemClick?.();
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: TYPE_CONFIG[r.type]?.color || '#6b7280' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate leading-tight">{r.title}</p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: SEVERITY_CONFIG[r.severity]?.color || '#6b7280' }}>
                              {r.severity}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">{r.status}</span>
                            {!hasGPS && <span className="text-[10px] text-orange-500">No GPS</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{moment(r.created_date).fromNow()}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}