import { createFileRoute } from "@tanstack/react-router";
import { Building2, Trophy, CloudSun, Wind, Car, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard/city-comparison")({
  head: () => ({ meta: [{ title: "City Comparison · TrafficOps AI" }] }),
  component: CityCompare,
});

const LEVEL_COLOR: Record<string, string> = {
  "free-flow": "#22c55e", moderate: "#eab308", heavy: "#f97316", critical: "#ef4444", unknown: "#94a3b8",
};

type City = {
  name: string; score: number; level: string;
  temp_c: number; condition: string;
  current_speed_kph: number; free_flow_speed_kph: number;
  incidents: number; rain_mm: number;
};

const BASE_CITIES: City[] = [
  { name: "Chennai",   score: 72, level: "heavy",    temp_c: 29, condition: "Partly Cloudy", current_speed_kph: 22, free_flow_speed_kph: 60, incidents: 7,  rain_mm: 0   },
  { name: "Bangalore", score: 81, level: "critical", temp_c: 24, condition: "Overcast",      current_speed_kph: 18, free_flow_speed_kph: 55, incidents: 14, rain_mm: 1.2 },
  { name: "Hyderabad", score: 45, level: "moderate", temp_c: 30, condition: "Sunny",         current_speed_kph: 38, free_flow_speed_kph: 60, incidents: 4,  rain_mm: 0   },
  { name: "Mumbai",    score: 88, level: "critical", temp_c: 28, condition: "Humid",         current_speed_kph: 14, free_flow_speed_kph: 50, incidents: 19, rain_mm: 3.5 },
  { name: "Delhi",     score: 65, level: "heavy",    temp_c: 34, condition: "Hazy",          current_speed_kph: 28, free_flow_speed_kph: 60, incidents: 11, rain_mm: 0   },
];

function CityCompare() {
  const [cities, setCities] = useState<City[]>(BASE_CITIES);
  const [refreshing, setRefreshing] = useState(false);

  // Simulate data updates
  function refresh() {
    setRefreshing(true);
    setTimeout(() => {
      setCities(
        BASE_CITIES.map((c) => ({
          ...c,
          score: Math.min(99, Math.max(10, c.score + Math.round((Math.random() - 0.5) * 10))),
          current_speed_kph: Math.max(8, c.current_speed_kph + Math.round((Math.random() - 0.5) * 6)),
        })).map((c) => ({
          ...c,
          level: c.score < 25 ? "free-flow" : c.score < 50 ? "moderate" : c.score < 75 ? "heavy" : "critical",
        })),
      );
      setRefreshing(false);
    }, 800);
  }

  // Auto-refresh every 15 s
  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...cities].sort((a, b) => a.score - b.score);
  const best = sorted[0];

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-center justify-between rounded-xl border border-green-500/40 bg-green-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4 text-green-400" />
          Best traffic flow right now:
          <strong className="text-green-400 ml-1">{best.name}</strong>
          <span className="text-muted-foreground">— {best.score}% congestion</span>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* City cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => {
          const isBest = c.name === best.name;
          const col = LEVEL_COLOR[c.level] ?? "#94a3b8";
          return (
            <div
              key={c.name}
              className={`rounded-xl border bg-card p-4 transition ${isBest ? "border-green-500/50 ring-1 ring-green-500/20" : "border-border"}`}
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                </div>
                {isBest && (
                  <span className="flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                    <Trophy className="h-2.5 w-2.5" /> Best
                  </span>
                )}
              </div>

              {/* Score */}
              <div className="mb-1 flex items-end justify-between">
                <span className="text-xs uppercase text-muted-foreground">Congestion</span>
                <span className="font-display text-3xl font-bold" style={{ color: col }}>{c.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${c.score}%`, backgroundColor: col }}
                />
              </div>
              <div
                className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{ color: col, borderColor: col + "50", background: col + "15" }}
              >
                {c.level}
              </div>

              {/* Stats */}
              <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><CloudSun className="h-3.5 w-3.5" /> Weather</span>
                  <span>{c.temp_c}°C · {c.condition}{c.rain_mm > 0 ? ` · ${c.rain_mm}mm` : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Wind className="h-3.5 w-3.5" /> Avg speed</span>
                  <span>{c.current_speed_kph} km/h <span className="text-muted-foreground">(ff {c.free_flow_speed_kph})</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Car className="h-3.5 w-3.5" /> Incidents</span>
                  <span className={c.incidents > 8 ? "text-orange-400 font-medium" : ""}>{c.incidents}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
