import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';
import moment from 'moment';

const sev = {
  critical: { dot: 'bg-destructive', text: 'text-destructive' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  info: { dot: 'bg-info', text: 'text-info' },
};

export default function RecentAlertsList({ alerts = [] }) {
  const list = alerts.slice(0, 5);
  return (
    <Card className="card-modern border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">Recent Alerts</CardTitle>
          <Link to={createPageUrl('Alerts')}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {list.length > 0 ? (
          list.map(a => {
            const s = sev[a.severity] || sev.info;
            return (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", s.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Clock className="h-3 w-3" />{moment(a.created_date).fromNow()}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No recent alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}