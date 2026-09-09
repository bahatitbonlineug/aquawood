import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wind, Droplets, Eye, Thermometer, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';
import moment from 'moment';

// Uganda districts with coordinates
const DISTRICTS = [
  { name: 'Kampala', lat: 0.3476, lon: 32.5825 },
  { name: 'Mbarara', lat: -0.6072, lon: 30.6545 },
  { name: 'Gulu', lat: 2.7748, lon: 32.2990 },
  { name: 'Jinja', lat: 0.4244, lon: 33.2041 },
  { name: 'Mbale', lat: 1.0796, lon: 34.1750 },
];

const WMO_CODES = {
  0: { label: 'Clear Sky', code: 'sunny' },
  1: { label: 'Mainly Clear', code: 'sunny' },
  2: { label: 'Partly Cloudy', code: 'partly_cloudy' },
  3: { label: 'Overcast', code: 'cloudy' },
  45: { label: 'Foggy', code: 'foggy' },
  48: { label: 'Icy Fog', code: 'foggy' },
  51: { label: 'Light Drizzle', code: 'rainy' },
  53: { label: 'Drizzle', code: 'rainy' },
  61: { label: 'Light Rain', code: 'rainy' },
  63: { label: 'Rain', code: 'rainy' },
  65: { label: 'Heavy Rain', code: 'rainy' },
  80: { label: 'Rain Showers', code: 'rainy' },
  81: { label: 'Heavy Showers', code: 'rainy' },
  95: { label: 'Thunderstorm', code: 'stormy' },
  99: { label: 'Hail Storm', code: 'stormy' },
};

const WeatherIcon = ({ code, className = 'h-6 w-6' }) => {
  const icons = {
    sunny: <Sun className={`${className} text-yellow-400`} />,
    partly_cloudy: <Cloud className={`${className} text-slate-400`} />,
    cloudy: <Cloud className={`${className} text-slate-500`} />,
    rainy: <CloudRain className={`${className} text-blue-400`} />,
    stormy: <CloudLightning className={`${className} text-purple-400`} />,
    foggy: <CloudFog className={`${className} text-slate-400`} />,
  };
  return icons[code] || <Cloud className={className} />;
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeather(selectedDistrict);
  }, [selectedDistrict]);

  const fetchWeather = async (district) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=Africa%2FNairobi&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();

      const cur = data.current;
      const wmoInfo = WMO_CODES[cur.weather_code] || { label: 'Unknown', code: 'cloudy' };

      const currentWeather = {
        temperature_c: Math.round(cur.temperature_2m),
        feels_like_c: Math.round(cur.apparent_temperature),
        humidity_pct: cur.relative_humidity_2m,
        wind_speed_kmh: Math.round(cur.wind_speed_10m),
        precipitation_mm: cur.precipitation,
        condition: wmoInfo.label,
        condition_code: wmoInfo.code,
        uv_index: data.daily.uv_index_max?.[0] || 0,
      };

      const forecastDays = data.daily.time.map((date, i) => ({
        date,
        condition_code: (WMO_CODES[data.daily.weather_code[i]] || { code: 'cloudy' }).code,
        condition: (WMO_CODES[data.daily.weather_code[i]] || { label: 'Cloudy' }).label,
        temp_max: Math.round(data.daily.temperature_2m_max[i]),
        temp_min: Math.round(data.daily.temperature_2m_min[i]),
        precipitation_mm: data.daily.precipitation_sum[i],
        uv_index: Math.round(data.daily.uv_index_max?.[i] || 0),
      }));

      setWeather(currentWeather);
      setForecast(forecastDays);

      // Save to DB (daily record — skip if today's record already exists)
      await saveToDB(district.name, currentWeather, forecastDays);
    } catch (e) {
      setError('Could not load weather data');
      console.error(e);
    }
    setLoading(false);
  };

  const saveToDB = async (districtName, currentWeather, forecastDays) => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const existing = await base44.entities.WeatherData.filter({
        date: today,
        district: districtName
      });
      const payload = {
        date: today,
        district: districtName,
        ...currentWeather,
        forecast_json: JSON.stringify(forecastDays),
        data_source: 'open_meteo'
      };
      if (existing.length > 0) {
        await base44.entities.WeatherData.update(existing[0].id, payload);
      } else {
        await base44.entities.WeatherData.create(payload);
      }
    } catch (e) {
      console.error('Failed to save weather to DB:', e);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-400" />
            Live Weather
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {DISTRICTS.map(d => (
              <button
                key={d.name}
                onClick={() => setSelectedDistrict(d)}
                className={`text-xs px-2 py-1 rounded-full transition-all ${
                  selectedDistrict.name === d.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading weather...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4 text-center">{error}</p>
        ) : weather ? (
          <div className="space-y-4">
            {/* Current Conditions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <WeatherIcon code={weather.condition_code} className="h-14 w-14" />
                <div>
                  <div className="text-4xl font-bold">{weather.temperature_c}°C</div>
                  <div className="text-sm text-muted-foreground">{weather.condition}</div>
                  <div className="text-xs text-muted-foreground">Feels like {weather.feels_like_c}°C</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{selectedDistrict.name}</div>
                <div className="text-xs text-muted-foreground">{moment().format('ddd, MMM D')}</div>
                <Badge variant="outline" className="text-xs mt-1">Live</Badge>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 bg-secondary/50 rounded-xl p-3">
              <div className="text-center">
                <Droplets className="h-4 w-4 mx-auto text-blue-400 mb-1" />
                <div className="text-sm font-semibold">{weather.humidity_pct}%</div>
                <div className="text-[10px] text-muted-foreground">Humidity</div>
              </div>
              <div className="text-center">
                <Wind className="h-4 w-4 mx-auto text-slate-400 mb-1" />
                <div className="text-sm font-semibold">{weather.wind_speed_kmh}</div>
                <div className="text-[10px] text-muted-foreground">km/h Wind</div>
              </div>
              <div className="text-center">
                <CloudRain className="h-4 w-4 mx-auto text-sky-400 mb-1" />
                <div className="text-sm font-semibold">{weather.precipitation_mm}mm</div>
                <div className="text-[10px] text-muted-foreground">Rain</div>
              </div>
              <div className="text-center">
                <Sun className="h-4 w-4 mx-auto text-orange-400 mb-1" />
                <div className="text-sm font-semibold">{weather.uv_index}</div>
                <div className="text-[10px] text-muted-foreground">UV Index</div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">7-Day Forecast</p>
              <div className="grid grid-cols-7 gap-1">
                {forecast.map((day, i) => (
                  <div key={day.date} className="flex flex-col items-center gap-1 bg-secondary/30 rounded-lg p-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {i === 0 ? 'Today' : moment(day.date).format('ddd')}
                    </span>
                    <WeatherIcon code={day.condition_code} className="h-4 w-4" />
                    <span className="text-xs font-bold">{day.temp_max}°</span>
                    <span className="text-[10px] text-muted-foreground">{day.temp_min}°</span>
                    {day.precipitation_mm > 0 && (
                      <span className="text-[9px] text-blue-400">{day.precipitation_mm}mm</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              Source: Open-Meteo API · Saved to database daily
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}