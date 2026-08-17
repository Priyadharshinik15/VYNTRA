import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, Droplets, Wind, Eye, CloudRain, Thermometer, Sun } from "lucide-react";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/weather")({
  head: () => ({ meta: [{ title: "Weather · TrafficOps AI" }] }),
  component: Weather,
});

// Static forecast (12 hours, 2-h steps) — realistic Chennai values
const STATIC_FORECAST = [
  { time: "08:00", temp_c: 27, condition: "Cloudy",       rain_mm: 0 },
  { time: "10:00", temp_c: 29, condition: "Partly Cloudy",rain_mm: 0 },
  { time: "12:00", temp_c: 32, condition: "Sunny",        rain_mm: 0 },
  { time: "14:00", temp_c: 34, condition: "Sunny",        rain_mm: 0 },
  { time: "16:00", temp_c: 33, condition: "Partly Cloudy",rain_mm: 0.5 },
  { time: "18:00", temp_c: 31, condition: "Rain",         rain_mm: 2.1 },
  { time: "20:00", temp_c: 29, condition: "Rain",         rain_mm: 3.5 },
  { time: "22:00", temp_c: 28, condition: "Cloudy",       rain_mm: 0.8 },
];

function ForecastIcon({ rain }: { rain: number }) {
  if (rain >= 2) return <CloudRain className="mx-auto my-2 h-6 w-6 text-blue-400" />;
  if (rain > 0)  return <CloudRain className="mx-auto my-2 h-6 w-6 text-blue-300" />;
  return <Sun className="mx-auto my-2 h-6 w-6 text-yellow-400" />;
}

function Weather() {
  const { weather } = useLiveData();

  const w = weather ?? {
    temp_c: 29, feels_like_c: 33, humidity: 72, condition: "Partly Cloudy",
    description: "partly cloudy skies", wind_kph: 14, rain_mm: 0, visibility_m: 8000,
  };

  const stats = [
    { i: Thermometer, l: "Feels like",  v: `${w.feels_like_c ?? w.temp_c}°C` },
    { i: Droplets,    l: "Humidity",    v: `${w.humidity}%` },
    { i: Wind,        l: "Wind",        v: `${w.wind_kph} km/h` },
    { i: Eye,         l: "Visibility",  v: w.visibility_m ? `${(w.visibility_m / 1000).toFixed(1)} km` : "8.0 km" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <CloudSun className="h-20 w-20 text-primary" style={{ filter: "drop-shadow(0 0 16px var(--color-primary))" }} />
            <div>
              <div className="font-display text-6xl font-bold">{w.temp_c}°C</div>
              <div className="mt-1 text-muted-foreground capitalize">{w.description ?? w.condition}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Chennai, Tamil Nadu</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-lg border border-border bg-card/60 p-3 text-center min-w-24">
                <s.i className="mx-auto mb-1 h-4 w-4 text-primary" />
                <div className="font-display text-lg font-bold">{s.v}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-display font-semibold">12-hour forecast (3-hour steps)</h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {STATIC_FORECAST.map((f, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/40 p-3 text-center">
              <div className="text-xs text-muted-foreground">{f.time}</div>
              <ForecastIcon rain={f.rain_mm} />
              <div className="font-display font-semibold">{f.temp_c}°</div>
              {f.rain_mm > 0 && (
                <div className="text-[10px] text-blue-400">{f.rain_mm} mm</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rain alert if raining */}
      {(w.rain_mm ?? 0) > 0 ? (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <CloudRain className="h-5 w-5 text-blue-400" />
            <div>
              <div className="font-semibold">Rain detected — {w.rain_mm} mm/h</div>
              <div className="text-sm text-muted-foreground">Traffic delays likely. Allow extra travel time.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <Sun className="h-5 w-5 text-green-400" />
            <div>
              <div className="font-semibold">No rain — good driving conditions</div>
              <div className="text-sm text-muted-foreground">Weather is clear. Congestion is traffic-driven, not weather-related.</div>
            </div>
          </div>
        </div>
      )}

      {/* Traffic + weather correlation */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">Weather-traffic correlation</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { cond: "Rain (current)", impact: "+0%",  ok: true  },
            { cond: "Light rain",     impact: "+18%", ok: false },
            { cond: "Heavy rain",     impact: "+34%", ok: false },
          ].map((row) => (
            <div key={row.cond} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{row.cond}</span>
              <span className={row.ok ? "text-green-400 font-medium" : "text-orange-400 font-medium"}>{row.impact} delay</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
