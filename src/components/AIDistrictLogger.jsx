import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import moment from 'moment';

const UGANDA_DISTRICTS = [
  { name: 'Kampala', lat: 0.3476, lon: 32.5825, forest_risk: 'high', water_bodies: 'Lake Victoria nearby' },
  { name: 'Mbarara', lat: -0.6072, lon: 30.6545, forest_risk: 'moderate', water_bodies: 'Lake Mburo area' },
  { name: 'Gulu', lat: 2.7748, lon: 32.2990, forest_risk: 'high', water_bodies: 'Achwa River basin' },
  { name: 'Jinja', lat: 0.4244, lon: 33.2041, forest_risk: 'moderate', water_bodies: 'Source of Nile, Lake Victoria' },
  { name: 'Mbale', lat: 1.0796, lon: 34.1750, forest_risk: 'moderate', water_bodies: 'Mt. Elgon watersheds' },
  { name: 'Masaka', lat: -0.3136, lon: 31.7333, forest_risk: 'high', water_bodies: 'Lake Victoria shore' },
  { name: 'Fort Portal', lat: 0.6671, lon: 30.2750, forest_risk: 'critical', water_bodies: 'Rwenzori glaciers, Crater Lakes' },
];

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const riskColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AIDistrictLogger({ compact = false }) {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [nextRun, setNextRun] = useState(null);
  const [countdown, setCountdown] = useState('');
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadRecentLogs();
    // Check if we should run immediately (if no log in last 30 min)
    checkAndRun();
    
    // Schedule every 30 min
    intervalRef.current = setInterval(() => {
      runAnalysis();
    }, INTERVAL_MS);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (nextRun) {
      countdownRef.current = setInterval(() => {
        const diff = moment(nextRun).diff(moment());
        if (diff <= 0) {
          setCountdown('Running soon...');
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setCountdown(`${mins}m ${secs}s`);
        }
      }, 1000);
      return () => clearInterval(countdownRef.current);
    }
  }, [nextRun]);

  const loadRecentLogs = async () => {
    setLoadingLogs(true);
    const recent = await base44.entities.AIDistrictLog.list('-logged_at', 50);
    setLogs(recent);
    setLoadingLogs(false);
  };

  const checkAndRun = async () => {
    const recent = await base44.entities.AIDistrictLog.list('-logged_at', 1);
    if (recent.length === 0) {
      runAnalysis();
    } else {
      const lastLog = recent[0];
      const minutesSinceLast = moment().diff(moment(lastLog.logged_at), 'minutes');
      if (minutesSinceLast >= 60) {
        runAnalysis();
      } else {
        const next = moment(lastLog.logged_at).add(60, 'minutes');
        setLastRun(lastLog.logged_at);
        setNextRun(next.toISOString());
      }
    }
  };

  const runAnalysis = async () => {
    if (running) return;
    setRunning(true);
    const now = moment().toISOString();

    // Pick a rotating subset of districts each cycle (3 per run to save credits)
    const minuteBlock = Math.floor(Date.now() / INTERVAL_MS);
    const startIdx = minuteBlock % UGANDA_DISTRICTS.length;
    const districtsThisRun = [
      UGANDA_DISTRICTS[startIdx % UGANDA_DISTRICTS.length],
      UGANDA_DISTRICTS[(startIdx + 1) % UGANDA_DISTRICTS.length],
      UGANDA_DISTRICTS[(startIdx + 2) % UGANDA_DISTRICTS.length],
    ];

    // Fetch weather for these districts
    for (const district of districtsThisRun) {
      try {
        // Get current weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=precipitation_sum,temperature_2m_max&timezone=Africa%2FNairobi&forecast_days=3`
        );
        const weatherData = await weatherRes.json();
        const cur = weatherData.current;
        const weekRain = weatherData.daily.precipitation_sum?.reduce((a, b) => a + b, 0)?.toFixed(1) || 0;
        const maxTemp = weatherData.daily.temperature_2m_max?.[0] || cur.temperature_2m;

        const weatherSummary = `Temp: ${Math.round(cur.temperature_2m)}°C, Humidity: ${cur.relative_humidity_2m}%, Wind: ${Math.round(cur.wind_speed_10m)}km/h, Rain today: ${cur.precipitation}mm, 3-day total rain: ${weekRain}mm, Max temp: ${Math.round(maxTemp)}°C`;

        // AI analysis
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are AQUA WOOD AI, an environmental monitoring system for Uganda.

Analyze the following real-time data for ${district.name} District, Uganda and provide an actionable environmental suggestion.

CURRENT WEATHER: ${weatherSummary}
KNOWN ENVIRONMENTAL PROFILE:
- Forest deforestation risk: ${district.forest_risk}
- Water bodies: ${district.water_bodies}
- Current time: ${moment().format('MMMM D, YYYY HH:mm')}

Based on this data, provide:
1. A brief environmental risk assessment (2 sentences max)
2. One specific actionable suggestion for field teams in this district
3. Any weather-related environmental alerts

Keep your response concise (under 120 words). Be specific to ${district.name}'s geography and ecology.`,
          response_json_schema: {
            type: 'object',
            properties: {
              risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
              assessment: { type: 'string' },
              suggestion: { type: 'string' },
              weather_alert: { type: 'string' },
              environmental_flags: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        await base44.entities.AIDistrictLog.create({
          district: district.name,
          logged_at: now,
          weather_summary: weatherSummary,
          satellite_indicators: `Forest risk: ${district.forest_risk} | Water: ${district.water_bodies}`,
          ai_suggestion: `${aiResult.assessment} ${aiResult.suggestion}${aiResult.weather_alert ? ' ⚠️ ' + aiResult.weather_alert : ''}`,
          risk_level: aiResult.risk_level || 'moderate',
          environmental_flags: aiResult.environmental_flags || []
        });
      } catch (e) {
        console.error(`AI log failed for ${district.name}:`, e);
      }
    }

    setLastRun(now);
    const next = moment().add(60, 'minutes').toISOString();
    setNextRun(next);
    await loadRecentLogs();
    setRunning(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {running ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Running AI district analysis...</span>
          </>
        ) : (
          <>
            <Brain className="h-3 w-3 text-primary" />
            <span>AI logs: Next in {countdown || '...'}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI District Analysis Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            {running ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Next: {countdown || 'Soon'}
              </Badge>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={runAnalysis} disabled={running}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          AI analyzes weather + satellite data every hour per district · {logs.length} logs recorded
        </p>
      </CardHeader>
      <CardContent>
        {loadingLogs ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No AI logs yet</p>
            <p className="text-xs mt-1">First analysis will run shortly</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{log.district}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${riskColors[log.risk_level] || riskColors.moderate}`}>
                      {log.risk_level?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {moment(log.logged_at).format('MMM D, HH:mm')}
                  </span>
                </div>
                {log.weather_summary && (
                  <p className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-2 py-1">
                    🌡 {log.weather_summary}
                  </p>
                )}
                <p className="text-xs leading-relaxed">{log.ai_suggestion}</p>
                {log.environmental_flags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {log.environmental_flags.map((flag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                        ⚠ {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}