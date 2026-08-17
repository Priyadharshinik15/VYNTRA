import { createFileRoute } from "@tanstack/react-router";
import {
  Moon, Sun, Globe, Bell, User, Map, Clock, CheckCircle2, Save,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Persistence helpers ────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Theme ──────────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">(() =>
    load<"dark" | "light">("tf_theme", "dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    save("tf_theme", theme);
  }, [theme]);

  const setTheme = (t: "dark" | "light") => setThemeState(t);
  return { theme, setTheme };
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);

  const toast = (m: string) => {
    setMsg(m);
    setVisible(true);
    setTimeout(() => setVisible(false), 2500);
  };

  return { toast, ToastEl: visible ? (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-4">
      <CheckCircle2 className="h-4 w-4 text-success" />
      {msg}
    </div>
  ) : null };
}

// ─── Route ──────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings · TrafficOps AI" }] }),
  component: SettingsPage,
});

// ─── Data ───────────────────────────────────────────────────────────────────
const languages = [
  "English",
  "தமிழ் (Tamil)",
  "తెలుగు (Telugu)",
  "ಕನ್ನಡ (Kannada)",
  "മലയാളം (Malayalam)",
  "हिन्दी (Hindi)",
  "मराठी (Marathi)",
  "বাংলা (Bengali)",
  "ગુજરાતી (Gujarati)",
  "ਪੰਜਾਬੀ (Punjabi)",
  "ଓଡ଼ିଆ (Odia)",
  "اردو (Urdu)",
  "Español",
  "Français",
  "Deutsch",
  "Italiano",
  "Português",
  "日本語",
  "한국어",
  "中文 (简体)",
  "العربية",
  "Русский",
];

const mapStyles = ["Streets", "Satellite", "Dark"] as const;
type MapStyle = (typeof mapStyles)[number];

const intervals = [15, 30, 60] as const;
type Interval = (typeof intervals)[number];

const notifKeys = [
  "Alerts",
  "Weather warnings",
  "Route changes",
  "Daily summary",
] as const;
type NotifKey = (typeof notifKeys)[number];

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast, ToastEl } = useToast();

  // Language
  const [language, setLanguage] = useState<string>(() =>
    load("tf_language", "English"),
  );

  // Map style
  const [mapStyle, setMapStyle] = useState<MapStyle>(() =>
    load<MapStyle>("tf_map_style", "Dark"),
  );

  // Prediction interval
  const [interval, setInterval] = useState<Interval>(() =>
    load<Interval>("tf_interval", 30),
  );

  // Notifications
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(() =>
    load("tf_notifs", {
      Alerts: true,
      "Weather warnings": true,
      "Route changes": true,
      "Daily summary": true,
    }),
  );

  // Profile edit
  const [profile, setProfile] = useState(() =>
    load("tf_profile", { name: "Operator", email: "operator@trafficops.ai" }),
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    save("tf_language", lang);
    // Update <html lang> attribute for accessibility
    document.documentElement.lang = lang === "English" ? "en" : lang.split(" ")[0].toLowerCase();
    toast(`Language set to ${lang}`);
  };

  const handleMapStyle = (s: MapStyle) => {
    setMapStyle(s);
    save("tf_map_style", s);
    toast(`Map style set to ${s}`);
  };

  const handleInterval = (n: Interval) => {
    setInterval(n);
    save("tf_interval", n);
    toast(`Prediction interval set to ${n} min`);
  };

  const handleNotifToggle = (key: NotifKey) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    save("tf_notifs", updated);
  };

  const handleProfileSave = () => {
    setProfile(profileDraft);
    save("tf_profile", profileDraft);
    setEditingProfile(false);
    toast("Profile updated");
  };

  const handleProfileCancel = () => {
    setProfileDraft(profile);
    setEditingProfile(false);
  };

  const handleThemeChange = (t: "dark" | "light") => {
    setTheme(t);
    toast(`Theme set to ${t}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences — changes are saved automatically.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Appearance ── */}
        <Section title="Appearance" icon={Sun}>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </Section>

        {/* ── Language ── */}
        <Section title="Language" icon={Globe}>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            {languages.length}+ languages supported. Currently: <strong>{language}</strong>
          </p>
        </Section>

        {/* ── Map style ── */}
        <Section title="Map Style" icon={Map}>
          <div className="grid grid-cols-3 gap-2">
            {mapStyles.map((s) => (
              <button
                key={s}
                onClick={() => handleMapStyle(s)}
                className={`rounded-md border p-3 text-sm transition-colors ${
                  mapStyle === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Active: <strong>{mapStyle}</strong>
          </p>
        </Section>

        {/* ── Prediction interval ── */}
        <Section title="Prediction Interval" icon={Clock}>
          <div className="flex gap-2">
            {intervals.map((n) => (
              <button
                key={n}
                onClick={() => handleInterval(n)}
                className={`flex-1 rounded-md border p-2.5 text-sm transition-colors ${
                  interval === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                {n} min
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Refreshing predictions every <strong>{interval} minutes</strong>.
          </p>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications" icon={Bell}>
          <div className="space-y-2 text-sm">
            {notifKeys.map((n) => (
              <label
                key={n}
                className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:bg-accent/30"
              >
                <span>{n}</span>
                <input
                  type="checkbox"
                  checked={notifs[n]}
                  onChange={() => handleNotifToggle(n)}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                />
              </label>
            ))}
          </div>
        </Section>

        {/* ── Profile ── */}
        <Section title="Profile" icon={User}>
          {!editingProfile ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{profile.name}</div>
                  <div className="text-sm text-muted-foreground">{profile.email}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setProfileDraft(profile);
                  setEditingProfile(true);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleProfileSave}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  onClick={handleProfileCancel}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Toast notification */}
      {ToastEl}
    </>
  );
}
