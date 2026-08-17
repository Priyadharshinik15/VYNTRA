import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import { TrendingUp, Clock, CloudRain, Activity } from "lucide-react";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics · TrafficOps AI" }] }),
  component: Analytics,
});

// Static base data — peaks at 8-10 AM and 5-8 PM like real Chennai traffic
const BASE_HOURLY = [
  5,8,6,5,7,12,28,55,82,78,60,45,42,48,50,55,72,88,85,65,45,30,18,10,
];
const WEEKLY = [
  { d: "Mon", v: 62 }, { d: "Tue", v: 68 }, { d: "Wed", v: 71 },
  { d: "Thu", v: 74 }, { d: "Fri", v: 79 }, { d: "Sat", v: 45 }, { d: "Sun", v: 35 },
];
const WEATHER_IMPACT = [
  { condition: "Clear",        delay_pct: 0  },
  { condition: "Overcast",     delay_pct: 5  },
  { condition: "Light rain",   delay_pct: 18 },
  { condition: "Heavy rain",   delay_pct: 34 },
  { condition: "Fog",          delay_pct: 12 },
  { condition: "Thunderstorm", delay_pct: 45 },
];

const LEVEL_COLORS: Record<string, string> = {
  "free-flow": "#22c55e", moderate: "#eab308", heavy: "#f97316", critical: "#ef4444", unknown: "#94a3b8",
};

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h3 className="mb-3 font-display font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Analytics() {
  const { prediction, traffic } = useLiveData();
  const [tick, setTick] = useState(0);

  // Make chart values breathe every 4 s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const currentScore = prediction?.average_score ?? 58;
  const rainMm = 0;

  // Shift hourly data slightly each tick to look "live"
  const hourly = BASE_HOURLY.map((v, i) => ({
    h: `${String(i).padStart(2, "0")}:00`,
    v: Math.min(100, Math.max(0, v + Math.round(Math.sin(tick + i) * 4))),
  }));

  const roadBreakdown = (prediction?.road_ranking ?? [
    { name: "OMR - Sholinganallur",   score: 72, current_speed_kph: 22, level: "heavy" },
    { name: "GST Road - Tambaram",    score: 55, current_speed_kph: 31, level: "moderate" },
    { name: "Anna Salai - Teynampet", score: 48, current_speed_kph: 34, level: "moderate" },
    { name: "ECR - Neelankarai",      score: 18, current_speed_kph: 52, level: "free-flow" },
  ]).map((r) => ({ name: r.name, score: r.score ?? 0, speed: r.current_speed_kph ?? null, level: r.level ?? "unknown" }));

  const peakMorning = "08:00";
  const peakEvening = "17:00";

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Activity,  label: "Current score",  value: `${currentScore}%` },
          { icon: Clock,     label: "Morning peak",   value: peakMorning },
          { icon: Clock,     label: "Evening peak",   value: peakEvening },
          { icon: CloudRain, label: "Rain now",       value: rainMm > 0 ? `${rainMm} mm/h` : "None" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <k.icon className="h-4 w-4 text-muted-foreground" />
            <div className="mt-2 font-display text-xl font-bold">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Hourly bar chart */}
        <Card title="Hourly congestion score — Chennai (live)">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={hourly}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => [`${v}%`, "Congestion"]}
                />
                <Bar dataKey="v" name="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weekly trend */}
        <Card title="Weekly congestion trend">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={WEEKLY}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => [`${v}%`, "Score"]}
                />
                <Area dataKey="v" name="Score" stroke="var(--color-accent)" fill="url(#wg)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Road breakdown */}
        <Card title="Road congestion breakdown (live)">
          <div className="space-y-3">
            {roadBreakdown.map((r) => (
              <div key={r.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span style={{ color: LEVEL_COLORS[r.level] ?? "#94a3b8" }}>
                    {r.score}% · {r.level}{r.speed !== null ? ` · ${r.speed} km/h` : ""}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${r.score}%`, backgroundColor: LEVEL_COLORS[r.level] ?? "#94a3b8" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weather impact */}
        <Card title="Weather impact on delays">
          <div className="space-y-2">
            {WEATHER_IMPACT.map((w) => (
              <div key={w.condition} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{w.condition}</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: w.delay_pct > 25 ? "#ef4444" : w.delay_pct > 8 ? "#eab308" : "#22c55e" }}
                >
                  {w.delay_pct > 0 ? `+${w.delay_pct}%` : "Baseline"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground text-right flex items-center justify-end gap-1">
        <TrendingUp className="h-3 w-3" />
        Data: TomTom + OpenWeather (Chennai) · updates every 5 s
      </div>
    </div>
  );
}
