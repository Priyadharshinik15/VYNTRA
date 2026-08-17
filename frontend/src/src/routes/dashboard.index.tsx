import { createFileRoute } from "@tanstack/react-router";
import {
  Gauge, Activity, CloudSun, Brain, Siren, MapPinned,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";

import { LiveMap } from "@/components/map/LiveMap";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard · TrafficOps AI" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  const { weather, traffic, alerts, prediction, status } = useLiveData();

  const avgSpeed = traffic?.roads?.length
    ? Math.round(
        traffic.roads.reduce((sum, r) => sum + (r.current_speed_kph ?? 0), 0) / traffic.roads.length,
      )
    : null;

  const kpis = [
    { label: "Avg Speed", value: avgSpeed !== null ? `${avgSpeed} km/h` : "—", icon: Gauge },
    { label: "Congestion", value: prediction ? `${prediction.average_score}%` : "—", icon: Activity },
    { label: "Weather", value: weather ? `${weather.temp_c}°C · ${weather.condition}` : "—", icon: CloudSun },
    { label: "Prediction level", value: prediction?.level ?? "—", icon: Brain },
    { label: "Active Alerts", value: String(alerts?.alerts?.length ?? 0), icon: Siren },
  ];

  const worst = prediction?.road_ranking?.[0];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">AI Traffic Summary</div>
            {worst ? (
              <h2 className="mt-1 font-display text-lg font-semibold">
                {worst.name} has the highest congestion score right now ({worst.score}).
              </h2>
            ) : (
              <h2 className="mt-1 font-display text-lg font-semibold">Loading current conditions…</h2>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <k.icon className="h-4 w-4 text-muted-foreground" />
            <div className="mt-3 font-display text-xl font-bold capitalize">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live Map</div>
              <h3 className="font-display text-base font-semibold">City overview</h3>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-success" : "bg-warning"}`} style={status === "live" ? { animation: "pulse-dot 1.5s infinite" } : undefined} />
              {status === "live" ? "Streaming" : status}
            </span>
          </div>
          <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-secondary/40">
            {traffic?.roads?.length ? (
              <LiveMap roads={traffic.roads} centerLat={13.0827} centerLon={80.2707} className="h-full w-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MapPinned className="mx-auto mb-2 h-8 w-8 opacity-60" />
                  <div className="text-sm">{traffic?.message ?? "Loading live traffic…"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Congestion trend (simulated)</div>
            <div className="mt-3 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prediction?.trend ?? []}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="score" stroke="var(--color-primary)" fill="url(#pg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Recent Alerts</div>
            <ul className="space-y-2.5">
              {(alerts?.alerts ?? []).map((a, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--${a.severity})` }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
