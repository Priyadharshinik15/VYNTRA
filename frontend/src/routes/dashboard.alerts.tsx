import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Car, CloudRain, CheckCircle2, Siren, Clock } from "lucide-react";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/alerts")({
  head: () => ({ meta: [{ title: "Alerts · TrafficOps AI" }] }),
  component: Alerts,
});

const ICONS: Record<string, typeof Car> = {
  traffic: Car,
  weather: CloudRain,
  status: CheckCircle2,
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; color: string }> = {
  danger:  { border: "border-red-500/40",    bg: "bg-red-500/10",    color: "#ef4444" },
  signal:  { border: "border-orange-500/40", bg: "bg-orange-500/10", color: "#f97316" },
  accent:  { border: "border-blue-500/40",   bg: "bg-blue-500/10",   color: "#60a5fa" },
  primary: { border: "border-primary/40",    bg: "bg-primary/10",    color: "var(--color-primary)" },
  warning: { border: "border-yellow-500/40", bg: "bg-yellow-500/10", color: "#eab308" },
};

// Fallback static alerts shown when backend is offline
const STATIC_ALERTS = [
  { type: "traffic", severity: "danger",  title: "Critical congestion · OMR - Sholinganallur",   detail: "22 km/h (free-flow 60 km/h) · Expect 15+ min delay" },
  { type: "traffic", severity: "signal",  title: "Heavy traffic · GST Road - Tambaram",          detail: "31 km/h (free-flow 55 km/h) · Consider alternate route" },
  { type: "weather", severity: "accent",  title: "Humidity alert — 72%",                         detail: "High humidity reducing road visibility marginally." },
  { type: "traffic", severity: "warning", title: "Moderate congestion · Anna Salai - Teynampet", detail: "34 km/h (free-flow 50 km/h) · Minor delays expected" },
  { type: "status",  severity: "primary", title: "ECR - Neelankarai flowing freely",              detail: "52 km/h · No incidents reported on this corridor" },
];

function AlertBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    danger: "Critical", signal: "High", warning: "Medium", accent: "Info", primary: "Normal",
  };
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.primary;
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: style.color + "60", color: style.color, background: style.color + "15" }}
    >
      {map[severity] ?? severity}
    </span>
  );
}

function Alerts() {
  const { alerts } = useLiveData();
  const items = alerts?.alerts?.length ? alerts.alerts : STATIC_ALERTS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Siren className="h-5 w-5 text-primary" />
          <div>
            <div className="font-display font-semibold">Active Alerts</div>
            <div className="text-xs text-muted-foreground">{items.length} alert{items.length !== 1 ? "s" : ""} · Chennai corridor</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Updated just now
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {items.map((a, i) => {
          const Icon = ICONS[a.type] ?? AlertTriangle;
          const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.primary;
          return (
            <div
              key={i}
              className={`flex items-start gap-4 rounded-xl border p-4 transition ${style.border} ${style.bg}`}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: style.color + "20", color: style.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{a.title}</div>
                  <AlertBadge severity={a.severity} />
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{a.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
