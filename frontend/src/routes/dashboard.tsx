import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Bell, Search, User, X, Car, CloudRain, CheckCircle2,
  AlertTriangle, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ── Hardcoded notifications ───────────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: 1,
    type: "danger",
    icon: Car,
    title: "Critical congestion — OMR Sholinganallur",
    detail: "Speed dropped to 22 km/h. Expect 15 min delay.",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    type: "warning",
    icon: Car,
    title: "Heavy traffic — GST Road Tambaram",
    detail: "31 km/h vs free-flow 55 km/h. Consider alternate.",
    time: "5 min ago",
    read: false,
  },
  {
    id: 3,
    type: "info",
    icon: CloudRain,
    title: "Rain forecast — 6 PM onwards",
    detail: "Light rain expected. Allow extra travel time.",
    time: "12 min ago",
    read: false,
  },
  {
    id: 4,
    type: "warning",
    icon: AlertTriangle,
    title: "Moderate congestion — Anna Salai",
    detail: "34 km/h (free-flow 50 km/h). Minor delays.",
    time: "18 min ago",
    read: true,
  },
  {
    id: 5,
    type: "success",
    icon: CheckCircle2,
    title: "ECR flowing freely",
    detail: "52 km/h — no incidents on this corridor.",
    time: "25 min ago",
    read: true,
  },
];

const TYPE_STYLE: Record<string, { dot: string; bg: string; border: string; color: string }> = {
  danger:  { dot: "bg-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    color: "#ef4444" },
  warning: { dot: "bg-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", color: "#f97316" },
  info:    { dot: "bg-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   color: "#60a5fa" },
  success: { dot: "bg-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30",  color: "#22c55e" },
};

// ── Bell dropdown ─────────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notes.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function markAllRead() {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-display font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                All caught up!
              </div>
            ) : (
              notes.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className={`relative flex items-start gap-3 px-4 py-3 transition hover:bg-accent/30 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    {/* Unread dot */}
                    {!n.read && (
                      <span className={`absolute left-2 top-4 h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    )}

                    {/* Icon */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
                      style={{ backgroundColor: style.color + "20", color: style.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.read ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">{n.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              to="/dashboard/alerts"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
            >
              View all alerts <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── User menu dropdown ────────────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary hover:bg-accent/50 transition-colors"
        aria-label="User menu"
      >
        <User className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Profile header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-sm">
              O
            </div>
            <div>
              <div className="text-sm font-semibold">Operator</div>
              <div className="text-xs text-muted-foreground">operator@trafficops.ai</div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" /> Settings
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Search bar (navigation) ───────────────────────────────────────────────────
const SEARCH_ROUTES = [
  { label: "Live Map",       path: "/dashboard/map" },
  { label: "AI Route Planner", path: "/dashboard/route-planner" },
  { label: "Prediction",     path: "/dashboard/prediction" },
  { label: "Analytics",      path: "/dashboard/analytics" },
  { label: "Weather",        path: "/dashboard/weather" },
  { label: "Alerts",         path: "/dashboard/alerts" },
  { label: "AI Insights",    path: "/dashboard/ai-insights" },
  { label: "City Comparison",path: "/dashboard/city-comparison" },
  { label: "Model Monitor",  path: "/dashboard/model-monitor" },
  { label: "Settings",       path: "/dashboard/settings" },
];

function NavSearch() {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim().length >= 1
    ? SEARCH_ROUTES.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div ref={ref} className="relative hidden flex-1 max-w-md md:block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        placeholder="Search roads, cities, alerts…"
        className="h-9 w-full rounded-md border border-input bg-secondary/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {showResults && filtered.length > 0 && (
        <div className="absolute left-0 top-10 z-50 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {filtered.map((r) => (
            <Link
              key={r.path}
              to={r.path}
              onClick={() => { setQuery(""); setShowResults(false); }}
              className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
            >
              {r.label}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard layout ──────────────────────────────────────────────────────────
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <NavSearch />
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
