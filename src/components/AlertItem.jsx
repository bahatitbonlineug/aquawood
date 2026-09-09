import { AlertTriangle, AlertCircle, Info, MapPin, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';

export default function AlertItem({ alert, onClick }) {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-500',
      dot: 'bg-red-500'
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      dot: 'bg-amber-500'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-500',
      dot: 'bg-blue-500'
    }
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all duration-200 cursor-pointer",
        config.bg, config.border,
        "hover:scale-[1.02] hover:shadow-md",
        !alert.is_read && "ring-2 ring-offset-2 ring-offset-background ring-primary/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("h-4 w-4", config.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{alert.title}</h4>
            {!alert.is_read && (
              <span className={cn("h-2 w-2 rounded-full animate-pulse", config.dot)} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {alert.message}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {alert.location?.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {alert.location.region}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {moment(alert.created_date).fromNow()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}