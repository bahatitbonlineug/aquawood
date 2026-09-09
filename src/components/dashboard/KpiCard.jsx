import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiCard({ title, value, sub, icon: Icon, accent = 'emerald', trend, trendDir }) {
  const accents = {
    emerald: { ring: 'bg-emerald-500/10 dark:bg-emerald-500/15', ic: 'text-emerald-600 dark:text-emerald-400', bar: 'from-emerald-500 to-emerald-400' },
    sky: { ring: 'bg-sky-500/10 dark:bg-sky-500/15', ic: 'text-sky-600 dark:text-sky-400', bar: 'from-sky-500 to-sky-400' },
    orange: { ring: 'bg-orange-500/10 dark:bg-orange-500/15', ic: 'text-orange-600 dark:text-orange-400', bar: 'from-orange-500 to-orange-400' },
    violet: { ring: 'bg-violet-500/10 dark:bg-violet-500/15', ic: 'text-violet-600 dark:text-violet-400', bar: 'from-violet-500 to-violet-400' },
    rose: { ring: 'bg-rose-500/10 dark:bg-rose-500/15', ic: 'text-rose-600 dark:text-rose-400', bar: 'from-rose-500 to-rose-400' },
  };
  const a = accents[accent] || accents.emerald;
  return (
    <div className="card-modern relative overflow-hidden p-4 group">
      <div className={cn("absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-80", a.bar)} />
      <div className="flex items-center justify-between">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", a.ring)}>
          <Icon className={cn("h-5 w-5", a.ic)} />
        </div>
        {trend && (
          <span className={cn("text-xs font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded-md", trendDir === 'down' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500')}>
            {trendDir === 'down' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-3 tracking-tight font-display text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}