import { createFileRoute } from "@tanstack/react-router";
import { Brain, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/prediction")({
  head: () => ({ meta: [{ title: "Prediction · TrafficOps AI" }] }),
  component: Prediction,
});

const LEVEL_COLORS: Record<string, string> = {
  "free-flow": "#22c55e", moderate: "#eab308", heavy: "#f97316", critical: "#ef4444",
};

function estimateDelay(score: number) {
  return `+${Math.round(score / 5)} min`;
}

export function Prediction() {
  const { prediction } = useLiveData();

  const avg = prediction?.average_score ?? 62;
  const level = prediction?.level ?? "moderate";
  const ranking = prediction?.road_ranking ?? [
    { name: "OMR - Sholinganallur",   score: 72, level: "heavy",    current_speed_kph: 22, free_flow_speed_kph: 60 },
    { name: "GST Road - Tambaram",    score: 55, level: "moderate", current_speed_kph: 31, free_flow_speed_kph: 55 },
    { name: "Anna Salai - Teynampet", score: 48, level: "moderate", current_speed_kph: 34, free_flow_speed_kph: 50 },
    { name: "ECR - Neelankarai",      score: 18, level: "free-flow",current_speed_kph: 52, free_flow_speed_kph: 65 },
  ];

  const trend = prediction?.trend ?? Array.from({ length: 12 }, (_, i) => ({
    t: `+${(i + 1) * 5}m`,
    score: Math.min(100, Math.max(0, avg + Math.round(Math.sin(i * 0.7) * 10))),
  }));

  const gaugeFraction = avg / 100;
  const levelColor = LEVEL_COLORS[level] ?? "#eab308";

  const trendDir = trend.length >= 2
    ? trend[trend.length - 1].score > trend[0].score ? "worsening" : "improving"
    : "stable";

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
        Road ranking uses live TomTom speed data. The 60-min trend is an AI short-term projection seeded from the current score.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">60-minute congestion forecast</h3>
            </div>
            <span className={`flex items-center gap-1 text-xs font-medium ${trendDir === "worsening" ? "text-orange-400" : "text-green-400"}`}>
              {trendDir === "worsening"
                ? <><TrendingUp className="h-3.5 w-3.5" /> Worsening</>
                : <><TrendingDown className="h-3.5 w-3.5" /> Improving</>}
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => [`${v}%`, "Congestion"]}
                />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Critical", fill: "#ef4444", fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#eab308" strokeDasharray="4 4" label={{ value: "Heavy", fill: "#eab308", fontSize: 10 }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gauge */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold">Congestion gauge</h3>
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="var(--color-border)" strokeWidth="10" fill="none" />
                <circle
                  cx="50" cy="50" r="42"
                  stroke={levelColor}
                  strokeWidth="10" fill="none"
                  strokeDasharray={`${gaugeFraction * 264} 264`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-3xl font-bold">{avg}%</div>
                <div className="text-xs font-medium capitalize" style={{ color: levelColor }}>{level}</div>
              </div>
            </div>
            {/* Legend */}
            <div className="grid w-full grid-cols-2 gap-1.5 text-xs">
              {Object.entries(LEVEL_COLORS).map(([lv, col]) => (
                <div key={lv} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
                  <span className="capitalize text-muted-foreground">{lv}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Road ranking */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">Road ranking (live)</h3>
        <div className="divide-y divide-border">
          {ranking.map((r) => {
            const col = LEVEL_COLORS[r.level ?? ""] ?? "#94a3b8";
            return (
              <div key={r.name} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.current_speed_kph} km/h · free-flow {r.free_flow_speed_kph} km/h
                  </div>
                </div>
                <div className="h-2 w-36 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.score ?? 0}%`, backgroundColor: col }} />
                </div>
                <div className="w-10 text-right text-sm font-mono font-bold" style={{ color: col }}>
                  {r.score ?? "—"}
                </div>
                <div className="w-16 text-right text-xs text-muted-foreground">{estimateDelay(r.score ?? 0)}</div>
                {(r.level === "heavy" || r.level === "critical") && (
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
