import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Cloud, CheckCircle2, AlertCircle, Loader2, RefreshCw, Activity } from "lucide-react";

import { api, type ModelData } from "@/services/api";

export const Route = createFileRoute("/dashboard/model-monitor")({
  head: () => ({ meta: [{ title: "Model Monitor · TrafficOps AI" }] }),
  component: ModelMonitor,
});

function Card({ title, icon: Icon, children, className = "" }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {(title || Icon) && (
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h3 className="font-display font-semibold">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function ModelMonitor() {
  const [data, setData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.getModel()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading model metrics…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        {error ?? "Failed to load model metrics. Is the backend running?"}
      </div>
    );
  }

  // Build scatter data for actual vs predicted
  const scatterData = data.road_labels.map((label, i) => ({
    label,
    actual: data.actuals[i] ?? 0,
    predicted: data.predictions[i] ?? 0,
  }));

  // Bar chart data for feature importance
  const importanceSorted = [...data.feature_importance].sort((a, b) => b.importance - a.importance);

  const driftColor =
    data.drift_status === "stable" ? "#22c55e" :
    data.drift_status === "mild drift" ? "#eab308" : "#ef4444";

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Cloud,          label: "Model",     value: data.model_version },
          { icon: CheckCircle2,   label: "Accuracy",  value: `${data.accuracy_pct}%` },
          { icon: Activity,       label: "MAE",       value: String(data.mae) },
          { icon: Activity,       label: "RMSE",      value: String(data.rmse) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className="h-4 w-4 text-muted-foreground" />
            <div className="mt-2 font-display text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Actual vs Predicted */}
        <Card title="Actual vs Predicted congestion" icon={Activity}>
          {scatterData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No road data yet.</div>
          ) : (
            <div className="space-y-2">
              {scatterData.map((r) => (
                <div key={r.label} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate text-muted-foreground max-w-[160px]">{r.label}</span>
                    <span>
                      <span className="text-muted-foreground">actual </span>
                      <strong>{r.actual}</strong>
                      <span className="text-muted-foreground"> · pred </span>
                      <strong className="text-primary">{r.predicted}</strong>
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="absolute h-full rounded-full bg-muted-foreground/40"
                      style={{ width: `${r.actual}%` }}
                    />
                    <div
                      className="absolute h-full rounded-full bg-primary opacity-80"
                      style={{ width: `${r.predicted}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
                <span><span className="inline-block h-2 w-4 rounded bg-muted-foreground/40 mr-1" />Actual</span>
                <span><span className="inline-block h-2 w-4 rounded bg-primary mr-1" />Predicted</span>
              </div>
            </div>
          )}
        </Card>

        {/* Feature importance */}
        <Card title="Feature importance" icon={Cloud}>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={importanceSorted} layout="vertical">
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} domain={[0, 1]} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={110} />
                <Tooltip
                  formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, "Importance"]}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                />
                <Bar dataKey="importance" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Data drift */}
        <Card title="Data drift (PSI)" icon={AlertCircle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-display text-2xl font-bold" style={{ color: driftColor }}>{data.psi}</span>
              <span className="ml-2 text-sm text-muted-foreground">PSI</span>
            </div>
            <span
              className="rounded-full border px-2 py-0.5 text-xs font-medium"
              style={{ color: driftColor, borderColor: `${driftColor}40`, background: `${driftColor}15` }}
            >
              {data.drift_status}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(data.psi / 0.3 * 100, 100)}%`,
                background: `linear-gradient(to right, #22c55e, #eab308, #ef4444)`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>0 (stable)</span><span>0.1</span><span>0.2</span><span>0.3+ (drift)</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Based on <strong>{data.history_snapshots}</strong> speed-ratio snapshots collected since startup.
          </div>
        </Card>

        {/* Deployment info */}
        <Card title="Deployment" icon={Cloud}>
          <div className="space-y-2 text-sm">
            {[
              { l: "Environment",   v: "Production" },
              { l: "Model",         v: data.model_version },
              { l: "Roads tracked", v: String(data.road_count) },
              { l: "Uptime",        v: "99.98%" },
              { l: "Region",        v: "ap-south-1" },
              { l: "Status",        v: "Running" },
            ].map((row) => (
              <div key={row.l} className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-muted-foreground">{row.l}</span>
                <span className="font-medium">{row.v}</span>
              </div>
            ))}
          </div>
          <button
            onClick={load}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh metrics
          </button>
        </Card>
      </div>
    </div>
  );
}
