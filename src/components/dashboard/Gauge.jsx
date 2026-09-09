import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { useTheme } from '@/Layout';

// Semicircle gauge 0..max
export default function Gauge({ value, max = 100, label, unit = '', color = '#059669', footer }) {
  const { theme } = useTheme();
  const track = theme === 'dark' ? '#1e2a33' : '#e2e8f0';
  const pct = Math.max(0, Math.min(1, value / max));
  const data = [{ name: 'g', value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="75%"
            outerRadius="110%"
            data={data}
            startAngle={180}
            endAngle={0}
            barSize={12}
          >
            <PolarAngleAxis type="number" domain={[0, 1]} tick={false} />
            <RadialBar background={{ fill: track }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <span className="text-xl font-bold font-display text-foreground">{value != null ? (value % 1 === 0 ? value : value.toFixed(2)) : '—'}</span>
          {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
        </div>
      </div>
      {label && <p className="text-xs font-medium text-muted-foreground -mt-1">{label}</p>}
      {footer && <p className="text-[11px] text-muted-foreground/70 text-center mt-0.5">{footer}</p>}
    </div>
  );
}