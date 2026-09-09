import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';

const statusCfg = {
  pending: { label: 'Pending', cls: 'bg-warning/15 text-warning' },
  investigating: { label: 'Ongoing', cls: 'bg-info/15 text-info' },
  resolved: { label: 'Completed', cls: 'bg-success/15 text-success' },
  dismissed: { label: 'Dismissed', cls: 'bg-muted text-muted-foreground' },
};

export default function RecentReportsList({ reports = [], onSelect, isAdmin }) {
  const list = reports.slice(0, 5);
  return (
    <Card className="card-modern border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">Recent Reports</CardTitle>
          <Link to={createPageUrl('Reports')}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {list.length > 0 ? (
          list.map(r => {
            const st = statusCfg[r.status] || statusCfg.pending;
            return (
              <div
                key={r.id}
                onClick={() => onSelect && isAdmin && onSelect(r)}
                className={cn("flex items-center gap-3 py-2 border-b border-border/50 last:border-0", isAdmin && "cursor-pointer hover:bg-muted/50 rounded-lg px-1 -mx-1")}
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate capitalize">{r.type?.replace('_', ' ')} · {r.location?.address || 'GPS'}</p>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0", st.cls)}>{st.label}</span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No reports submitted yet</p>
            <Link to={createPageUrl('Reports')}>
              <Button variant="outline" size="sm" className="mt-2">Submit First Report</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}