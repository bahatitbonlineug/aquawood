import { 
  TreeDeciduous, 
  Droplets, 
  AlertTriangle, 
  Bird, 
  HelpCircle,
  MapPin,
  Clock,
  CheckCircle,
  Search,
  XCircle
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import moment from 'moment';

export default function ReportCard({ report, onClick }) {
  const typeConfig = {
    deforestation: { icon: TreeDeciduous, color: 'text-green-500', bg: 'bg-green-500/10' },
    water_pollution: { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    illegal_activity: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    wildlife: { icon: Bird, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    other: { icon: HelpCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' }
  };

  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary', icon: Clock },
    investigating: { label: 'Investigating', variant: 'default', icon: Search },
    resolved: { label: 'Resolved', variant: 'outline', icon: CheckCircle },
    dismissed: { label: 'Dismissed', variant: 'destructive', icon: XCircle }
  };

  const severityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  const config = typeConfig[report.type] || typeConfig.other;
  const status = statusConfig[report.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl", config.bg)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold truncate">{report.title}</h3>
            <Badge variant={status.variant} className="shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {report.description}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">
                {report.location?.address || `${report.location?.lat?.toFixed(4)}, ${report.location?.lng?.toFixed(4)}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", severityColors[report.severity])} />
              <span className="text-xs capitalize text-muted-foreground">{report.severity}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {moment(report.created_date).format('MMM D, YYYY')}
            </span>
            {report.verified && (
              <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}