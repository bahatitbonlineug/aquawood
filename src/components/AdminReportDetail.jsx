import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, Calendar, User, Phone, CheckCircle, XCircle,
  AlertTriangle, Brain, Loader2, ExternalLink, Camera,
  FileText, Clock, Shield
} from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';
import ReactMarkdown from 'react-markdown';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-red-100 text-red-700',
};

export default function AdminReportDetail({ report, onClose, onStatusChange, onVerify }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(report.ai_analysis || '');
  const [status, setStatus] = useState(report.status);

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are AQUA WOOD AI — expert environmental analyst for Uganda.

Analyze this field report submitted by a community monitor:

REPORT DETAILS:
- Title: ${report.title}
- Type: ${report.type}
- Severity: ${report.severity}
- Description: ${report.description}
- Location: ${report.location?.address || `${report.location?.lat?.toFixed(5)}, ${report.location?.lng?.toFixed(5)}`}
- GPS Coordinates: ${report.location?.lat?.toFixed(6)}, ${report.location?.lng?.toFixed(6)}
- Submitted: ${moment(report.created_date).format('MMMM D, YYYY h:mm A')}
- Reporter Contact: ${report.contact_phone || 'Not provided'}
- Evidence: ${report.evidence_description || 'Not provided'}
- Actions taken: ${report.actions_taken || 'None reported'}

Provide a structured expert analysis:
1. **Threat Assessment** — severity validation and environmental impact
2. **Location Analysis** — what is known about this location in Uganda (ecosystem, protected status, nearby water bodies/forests)
3. **Satellite Cross-Reference** — what MODIS/Landsat/Sentinel-2 data would likely show for this area and type of incident
4. **Recommended Actions** — immediate response, NEMA reporting requirements, field investigation steps
5. **Legal Framework** — relevant Uganda environmental laws (NEMA Act, NFP, Water Act)

Be specific, actionable, and cite real Uganda environmental data.`,
        add_context_from_internet: true,
      });
      setAiResult(result);
      await base44.entities.Report.update(report.id, { ai_analysis: result });
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const hasGPS = report.location?.lat && report.location?.lng &&
    isFinite(report.location.lat) && isFinite(report.location.lng);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg">{report.title}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", SEVERITY_COLORS[report.severity])}>
                  {report.severity?.toUpperCase()} SEVERITY
                </span>
                <span className={cn("text-xs px-2 py-1 rounded-full font-medium capitalize", STATUS_COLORS[report.status])}>
                  {report.status}
                </span>
                {report.verified && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">
                  {report.type?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              <Shield className="h-3 w-3 mr-1" />
              Admin View
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 space-y-5">
          <div className="space-y-5">
            {/* Reporter Info */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Reporter
                </p>
                <p className="text-sm font-medium">{report.reporter_name || report.created_by || 'Anonymous'}</p>
                {report.contact_phone && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {report.contact_phone}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{report.created_by}</p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Submitted
                </p>
                <p className="text-sm font-medium">{moment(report.created_date).format('MMM D, YYYY')}</p>
                <p className="text-xs text-muted-foreground">{moment(report.created_date).format('h:mm A')} · {moment(report.created_date).fromNow()}</p>
                {report.observation_date && (
                  <p className="text-xs text-muted-foreground mt-1">Observed: {moment(report.observation_date).format('MMM D, YYYY h:mm A')}</p>
                )}
              </div>
            </div>

            {/* GPS Location */}
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> GPS Location
              </p>
              {hasGPS ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{report.location?.address || 'Address not available'}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    Lat: {report.location.lat.toFixed(6)} · Lng: {report.location.lng.toFixed(6)}
                    {report.gps_accuracy && ` · ±${report.gps_accuracy}m`}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    Open in Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`https://earthengine.google.com/map/#lon=${report.location.lng}&lat=${report.location.lat}&zoom=14`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                  >
                    View on Google Earth Engine <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-orange-500">⚠ No GPS coordinates recorded with this report</p>
              )}
              {report.location_description && (
                <p className="text-xs text-muted-foreground mt-2 italic">"{report.location_description}"</p>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Incident Description
              </p>
              <p className="text-sm leading-relaxed">{report.description}</p>
            </div>

            {/* Evidence */}
            {report.evidence_description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Evidence Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.evidence_description}</p>
              </div>
            )}

            {/* Photos */}
            {report.images?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Photo Evidence ({report.images.length} photo{report.images.length !== 1 ? 's' : ''})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {report.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} alt={`Evidence ${i + 1}`} className="w-full h-28 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Witnesses + Actions */}
            {(report.witnesses || report.actions_taken) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {report.witnesses && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Witnesses</p>
                    <p className="text-sm">{report.witnesses}</p>
                  </div>
                )}
                {report.actions_taken && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Actions Taken</p>
                    <p className="text-sm">{report.actions_taken}</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis */}
            <div className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-primary/5 border-b">
                <div className="flex items-center gap-2">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
                    alt="AQUA WOOD AI"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <p className="text-sm font-semibold">AQUA WOOD AI Analysis</p>
                </div>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={runAIAnalysis} disabled={analyzing}>
                  {analyzing ? <><Loader2 className="h-3 w-3 animate-spin" />Analyzing...</> : <><Brain className="h-3 w-3" />{aiResult ? 'Re-analyze' : 'Run Analysis'}</>}
                </Button>
              </div>
              <div className="p-3">
                {analyzing ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Analyzing with satellite data + Uganda environmental context...</span>
                  </div>
                ) : aiResult ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="my-1.5 text-sm leading-relaxed">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        ul: ({ children }) => <ul className="ml-4 list-disc my-1.5">{children}</ul>,
                        li: ({ children }) => <li className="my-0.5 text-sm">{children}</li>,
                        h2: ({ children }) => <p className="font-bold text-sm mt-3 mb-1">{children}</p>,
                      }}
                    >
                      {aiResult}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Click "Run Analysis" for AI-powered environmental assessment of this report</p>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            <div className="border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Admin Actions
              </p>
              <div className="flex flex-wrap gap-3">
                <Select value={status} onValueChange={(val) => { setStatus(val); onStatusChange(report.id, val); }}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={report.verified ? "destructive" : "default"}
                  className="h-8 text-xs gap-1"
                  onClick={() => onVerify(report.id, !report.verified)}
                >
                  {report.verified ? <><XCircle className="h-3 w-3" />Unverify</> : <><CheckCircle className="h-3 w-3" />Verify Report</>}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}