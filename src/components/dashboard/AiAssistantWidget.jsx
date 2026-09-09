import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';
import moment from 'moment';

const riskStyles = {
  low: 'text-success bg-success/10',
  moderate: 'text-amber-600 bg-amber-500/10',
  high: 'text-orange-600 bg-orange-500/10',
  critical: 'text-destructive bg-destructive/10',
};

export default function AiAssistantWidget({ aiLogs = [] }) {
  const today = aiLogs.slice(0, 3);
  return (
    <Card className="card-modern border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow">
            <Brain className="h-4 w-4 text-white" />
          </div>
          AQUAWOOD AI Assistant
        </CardTitle>
        <p className="text-xs text-muted-foreground">Today's Summary</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {today.length > 0 ? (
          today.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{log.district}</p>
                <p className="text-[11px] text-muted-foreground truncate">{moment(log.logged_at).format('MMM D, HH:mm')}</p>
              </div>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", riskStyles[log.risk_level] || riskStyles.moderate)}>
                {log.risk_level}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">AI district analysis will appear here</p>
            <p className="text-xs mt-1">Runs hourly across Uganda districts</p>
          </div>
        )}
        <Link to={createPageUrl('AIAssistant')}>
          <Button className="w-full gap-2 bg-brand-gradient hover:opacity-90 shadow-glow mt-1 border-0">
            <Brain className="h-4 w-4" /> Generate AI Report
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}