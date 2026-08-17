import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPinned, Route as RouteIcon, Brain, BarChart3, CloudSun,
  Siren, Sparkles, Building2, Cloud, ArrowRight,
  Activity, Zap, Gauge,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: MapPinned, title: "Live Map", desc: "Real-time roads, vehicles, heatmaps." },
  { icon: RouteIcon, title: "AI Route Planner", desc: "Best route via traffic + weather + events." },
  { icon: Brain, title: "Prediction", desc: "XGBoost congestion forecast up to 60 min." },
  { icon: BarChart3, title: "Analytics", desc: "Trends, peaks, weather impact." },
  { icon: CloudSun, title: "Weather", desc: "Live conditions & forecast." },
  { icon: Siren, title: "Alerts", desc: "Incidents, closures, rain warnings." },
  { icon: Sparkles, title: "AI Insights", desc: "Copilot explains congestion causes." },
  { icon: Cloud, title: "MLOps", desc: "Model health, drift, retraining." },
];

const workflow = ["Traffic", "AI", "Prediction", "Dashboard"];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent surface-glow">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              TrafficOps <span className="text-primary">AI</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          </nav>
          <Link
            to="/dashboard"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Launch <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75" style={{ animation: "pulse-dot 1.8s infinite" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live smart-city monitoring · v1.0
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              AI-Powered <span className="text-gradient">Traffic</span> Prediction<br />
              for Smarter Cities
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Predict congestion before it happens. Navigate smarter, save time,
              and cut emissions with real-time ML routing.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg surface-glow hover:opacity-95"
              >
                Explore Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/40 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-card"
              >
                See Features
              </a>
            </div>

            {/* Stat strip */}
            <div className="mt-14 grid grid-cols-3 gap-4 border-t border-border/60 pt-8">
              {[
                { k: "98%", v: "Prediction accuracy", icon: Gauge },
                { k: "<200ms", v: "Real-time latency", icon: Zap },
                { k: "20+", v: "Languages supported", icon: Sparkles },
              ].map((s) => (
                <div key={s.v} className="text-left">
                  <s.icon className="mb-2 h-4 w-4 text-primary" />
                  <div className="font-display text-2xl font-bold">{s.k}</div>
                  <div className="text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero traffic photo */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="relative rounded-2xl border border-border bg-card/40 p-2 backdrop-blur shadow-[var(--shadow-elegant)]">
              <div className="relative h-72 overflow-hidden rounded-xl md:h-[420px]">
                {/* Photo */}
                <img
                  src="/traffic-hero.jpg"
                  alt="Night city traffic with headlights and taillights on a multi-lane road"
                  className="h-full w-full object-cover"
                />
                {/* Dark gradient overlay so text badges stay readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Live status badge — top left */}
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" style={{ animation: "pulse-dot 1.5s infinite" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                  Live monitoring
                </div>

                {/* Floating stat chips */}
                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  <div className="rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
                    <span className="font-bold text-primary">72%</span> congestion · OMR
                  </div>
                  <div className="rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
                    <span className="font-bold text-green-400">52 km/h</span> · ECR free-flow
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3">
                  <div className="text-sm font-semibold text-white drop-shadow">
                    Chennai · Multi-corridor AI monitoring
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: "4 roads", color: "bg-primary" },
                      { label: "Live data", color: "bg-green-500" },
                      { label: "AI active", color: "bg-accent" },
                    ].map((chip) => (
                      <span key={chip.label} className={`rounded-full ${chip.color} px-2.5 py-0.5 text-[10px] font-semibold text-white`}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <div className="text-sm font-medium text-primary">Features</div>
          <h2 className="mt-2 font-display text-4xl font-bold">Everything a modern city needs</h2>
          <p className="mt-3 text-muted-foreground">One unified command center for traffic operators, planners, and drivers.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:border-primary/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-card/50 p-10 backdrop-blur">
          <div className="text-center">
            <div className="text-sm font-medium text-primary">Workflow</div>
            <h2 className="mt-2 font-display text-3xl font-bold">Data becomes decisions in seconds</h2>
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 md:flex-row md:justify-between">
            {workflow.map((w, i) => (
              <div key={w} className="flex flex-1 items-center gap-4">
                <div className="flex flex-1 flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm font-semibold text-primary surface-glow">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-3 text-sm font-semibold">{w}</div>
                </div>
                {i < workflow.length - 1 && (
                  <div className="relative hidden h-px flex-1 bg-border md:block">
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-primary to-transparent" style={{ animation: "flow 2s linear infinite" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            TrafficOps AI · Predict • Navigate • Optimize
          </div>
          <div className="text-xs text-muted-foreground">
            Powered by SmartTrafficOps · Built for smart cities
          </div>
        </div>
      </footer>
    </div>
  );
}
