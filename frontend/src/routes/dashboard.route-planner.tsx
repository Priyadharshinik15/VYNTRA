import { createFileRoute } from "@tanstack/react-router";
import {
  Route as RouteIcon, Mic, Home, Building2, GraduationCap,
  Zap, Leaf, Ban, Trophy, Loader2, Clock, Fuel, Wind,
  Navigation, ArrowRight, MapPin, CheckCircle2, Info,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/dashboard/route-planner")({
  head: () => ({ meta: [{ title: "AI Route Planner · TrafficOps AI" }] }),
  component: RoutePlanner,
});

// ── Types ────────────────────────────────────────────────────────────────────
type RouteVariant = {
  travel_min: number;
  distance_km: number;
  traffic_delay_min: number;
  fuel_l: number;
  co2_kg: number;
  confidence: number;
};

type RouteResult = {
  recommended_type: string;
  travel_min: number;
  distance_km: number;
  traffic_delay_min: number;
  fuel_l: number;
  co2_kg: number;
  confidence: number;
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  all_routes: Record<string, RouteVariant>;
  steps: string[];
};

// ── Known places (Chennai area) ──────────────────────────────────────────────
const KNOWN_PLACES: Record<string, { lat: number; lon: number }> = {
  "current location":          { lat: 13.0827, lon: 80.2707 },
  "home":                      { lat: 13.0827, lon: 80.2707 },
  "anna salai":                { lat: 13.0418, lon: 80.2417 },
  "anna salai, chennai":       { lat: 13.0418, lon: 80.2417 },
  "office":                    { lat: 13.0418, lon: 80.2417 },
  "iit madras":                { lat: 13.0117, lon: 80.2337 },
  "iit madras, chennai":       { lat: 13.0117, lon: 80.2337 },
  "college":                   { lat: 13.0117, lon: 80.2337 },
  "chennai airport":           { lat: 12.9941, lon: 80.1707 },
  "airport":                   { lat: 12.9941, lon: 80.1707 },
  "marina beach":              { lat: 13.0500, lon: 80.2824 },
  "beach":                     { lat: 13.0500, lon: 80.2824 },
  "central station":           { lat: 13.0827, lon: 80.2750 },
  "chennai central":           { lat: 13.0827, lon: 80.2750 },
  "t nagar":                   { lat: 13.0392, lon: 80.2329 },
  "tambaram":                  { lat: 12.9249, lon: 80.1000 },
  "omr":                       { lat: 12.9010, lon: 80.2279 },
  "sholinganallur":            { lat: 12.9010, lon: 80.2279 },
  "ecr":                       { lat: 12.9500, lon: 80.2580 },
  "velachery":                 { lat: 12.9815, lon: 80.2209 },
  "adyar":                     { lat: 13.0012, lon: 80.2565 },
  "guindy":                    { lat: 13.0067, lon: 80.2206 },
  "perambur":                  { lat: 13.1143, lon: 80.2329 },
  "egmore":                    { lat: 13.0732, lon: 80.2609 },
};

// ── Simulation helpers ────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolvePlace(query: string): { lat: number; lon: number } | null {
  const key = query.trim().toLowerCase();
  if (KNOWN_PLACES[key]) return KNOWN_PLACES[key];
  // partial match
  for (const [k, v] of Object.entries(KNOWN_PLACES)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}

const HOUR = new Date().getHours();
const IS_PEAK = (HOUR >= 8 && HOUR <= 10) || (HOUR >= 17 && HOUR <= 20);

function simulateRoute(
  from: { lat: number; lon: number },
  to:   { lat: number; lon: number },
  type: string,
): RouteVariant {
  const dist = haversine(from.lat, from.lon, to.lat, to.lon);
  // Road distance is ~1.35× crow-fly for city grids
  const roadDist = Math.round(dist * 1.35 * 10) / 10;

  // Base speed depends on type + time of day
  const peakPenalty = IS_PEAK ? 0.6 : 1.0;
  const speedMap: Record<string, number> = {
    ai:             32 * peakPenalty,
    fastest:        38 * peakPenalty,
    eco:            28 * peakPenalty,
    "avoid-traffic":30 * peakPenalty * 1.1,
    "avoid-toll":   30 * peakPenalty,
  };
  const speed = speedMap[type] ?? 30 * peakPenalty;
  const travel_min = Math.round((roadDist / speed) * 60);
  const traffic_delay_min = IS_PEAK ? Math.round(travel_min * 0.25) : Math.round(travel_min * 0.05);

  // Fuel: ~0.07 L/km petrol; eco -15%, avoid-traffic +5%
  const fuelFactor = type === "eco" ? 0.85 : type === "avoid-traffic" ? 1.05 : 1.0;
  const fuel_l = Math.round(roadDist * 0.07 * fuelFactor * 10) / 10;
  const co2_kg  = Math.round(fuel_l * 2.31 * 10) / 10;

  // Confidence: lower during peak, higher for ai/fastest
  const confBase = type === "ai" ? 93 : type === "fastest" ? 88 : 82;
  const confidence = Math.min(99, Math.max(60, confBase - (IS_PEAK ? 8 : 0) + Math.round(Math.random() * 4)));

  return { travel_min: travel_min + traffic_delay_min, distance_km: roadDist, traffic_delay_min, fuel_l, co2_kg, confidence };
}

function buildTurnByTurn(fromName: string, toName: string, dist: number): string[] {
  const steps = [
    `Start from ${fromName}`,
    "Head south-east on the main road",
    dist > 5 ? "Continue on the inner ring road" : "Turn right at the signal",
    dist > 10 ? "Merge onto the outer ring road" : "Continue straight for 2 km",
    dist > 15 ? "Take the flyover and continue" : "Turn left at the landmark",
    `Arrive at ${toName}`,
  ];
  return steps.slice(0, dist > 10 ? 6 : 4);
}

// ── Route type config ─────────────────────────────────────────────────────────
const ROUTE_TYPES = [
  { key: "ai",             icon: Trophy,  label: "AI Route",      desc: "Best overall" },
  { key: "fastest",        icon: Zap,     label: "Fastest",       desc: "Min ETA" },
  { key: "eco",            icon: Leaf,    label: "Eco",           desc: "Low fuel/CO₂" },
  { key: "avoid-traffic",  icon: Ban,     label: "Avoid Traffic", desc: "Skip jams" },
  { key: "avoid-toll",     icon: Ban,     label: "Avoid Toll",    desc: "No tolls" },
];

const QUICK_DEST = [
  { icon: Home,          label: "Home",    value: "Home" },
  { icon: Building2,     label: "Office",  value: "Anna Salai" },
  { icon: GraduationCap, label: "College", value: "IIT Madras" },
  { icon: Navigation,    label: "Airport", value: "Chennai Airport" },
];

const TYPE_LABEL: Record<string, string> = {
  ai: "AI Optimised", fastest: "Speed Optimised",
  eco: "Eco Optimised", "avoid-traffic": "Traffic Avoided", "avoid-toll": "Toll-Free",
};

function delayColor(min: number) {
  if (min < 5) return "text-green-400";
  if (min < 15) return "text-yellow-400";
  return "text-red-400";
}

// ── Map component (OpenStreetMap iframe) ─────────────────────────────────────
function RouteMap({ result }: { result: RouteResult | null }) {
  if (!result) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <RouteIcon className="h-12 w-12 text-primary opacity-80" style={{ filter: "drop-shadow(0 0 12px var(--color-primary))" }} />
        <div className="font-display text-lg font-semibold">AI Route Map</div>
        <div className="text-sm text-muted-foreground">Enter a destination to calculate your route</div>
        <div className="mt-1 text-xs text-muted-foreground opacity-60">Powered by OpenStreetMap · AI routing simulation</div>
      </div>
    );
  }

  const { origin: o, destination: d } = result;
  const minLat = Math.min(o.lat, d.lat) - 0.03;
  const maxLat = Math.max(o.lat, d.lat) + 0.03;
  const minLon = Math.min(o.lon, d.lon) - 0.03;
  const maxLon = Math.max(o.lon, d.lon) + 0.03;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${o.lat}%2C${o.lon}`;

  return (
    <>
      <iframe
        key={src}
        title="Route Map"
        src={src}
        className="absolute inset-0 h-full w-full rounded-xl"
        style={{ border: "none" }}
      />
      {/* Destination pin overlay */}
      <div className="absolute bottom-4 right-4 rounded-xl border border-border bg-card/90 p-3 backdrop-blur text-xs space-y-1 min-w-44">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <Navigation className="h-3.5 w-3.5" /> Route active
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3 text-green-400" />
          <span className="truncate max-w-36">{o.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Navigation className="h-3 w-3 text-primary" />
          <span className="truncate max-w-36">{d.name}</span>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function RoutePlanner() {
  const [origin, setOrigin]           = useState("Current location");
  const [destination, setDestination] = useState("");
  const [selectedType, setSelectedType] = useState("ai");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<RouteResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [activeStep, setActiveStep]   = useState(0);
  const destRef = useRef<HTMLInputElement>(null);

  // Auto-advance step indicator while route is shown
  useEffect(() => {
    if (!result) return;
    const id = setInterval(() => {
      setActiveStep((s) => (s < result.steps.length - 1 ? s + 1 : s));
    }, 3000);
    return () => clearInterval(id);
  }, [result]);

  function findRoute() {
    if (!destination.trim()) { destRef.current?.focus(); return; }

    const fromCoords = resolvePlace(origin);
    const toCoords   = resolvePlace(destination);

    if (!fromCoords) { setError(`Unknown location: "${origin}". Try: Current location, Anna Salai, IIT Madras, etc.`); return; }
    if (!toCoords)   { setError(`Unknown destination: "${destination}". Try: Chennai Airport, Marina Beach, T Nagar, Tambaram, etc.`); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    // Simulate a 1.2s API call
    setTimeout(() => {
      const main = simulateRoute(fromCoords, toCoords, selectedType);
      const all: Record<string, RouteVariant> = {};
      for (const t of ["fastest", "eco", "avoid-traffic", "avoid-toll"]) {
        all[t] = simulateRoute(fromCoords, toCoords, t);
      }

      const fromName = Object.entries(KNOWN_PLACES).find(
        ([, v]) => v.lat === fromCoords.lat && v.lon === fromCoords.lon
      )?.[0] ?? origin;
      const toName = Object.entries(KNOWN_PLACES).find(
        ([, v]) => v.lat === toCoords.lat && v.lon === toCoords.lon
      )?.[0] ?? destination;

      setResult({
        ...main,
        recommended_type: selectedType,
        origin: { name: origin, lat: fromCoords.lat, lon: fromCoords.lon },
        destination: { name: destination, lat: toCoords.lat, lon: toCoords.lon },
        all_routes: all,
        steps: buildTurnByTurn(fromName, toName, main.distance_km),
      });
      setLoading(false);
    }, 1200);
  }

  function handleVoice() {
    const SR = (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition
            || (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition;
    if (!SR) { alert("Voice input not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onresult = (e: SpeechRecognitionEvent) => setDestination(e.results[0][0].transcript);
    rec.start();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">

      {/* ── Left panel ── */}
      <aside className="space-y-4 overflow-y-auto max-h-[calc(100vh-7rem)]">

        {/* From / To */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">From</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Destination</label>
            <div className="relative mt-1">
              <input
                ref={destRef}
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && findRoute()}
                placeholder="e.g. Chennai Airport, T Nagar, OMR…"
                className="h-10 w-full rounded-md border border-input bg-secondary/50 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={handleVoice} title="Voice input"
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/10">
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_DEST.map((f) => (
              <button key={f.label} onClick={() => { setDestination(f.value); setError(null); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs hover:border-primary/50 transition">
                <f.icon className="h-3 w-3" /> {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route type */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Route type</div>
          <div className="grid grid-cols-2 gap-2">
            {ROUTE_TYPES.map((r) => {
              const active = selectedType === r.key;
              return (
                <button key={r.key} onClick={() => setSelectedType(r.key)}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <r.icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Find Route button */}
        <button onClick={findRoute} disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-semibold text-primary-foreground surface-glow hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</>
            : <><RouteIcon className="h-4 w-4" /> Find Route</>}
        </button>

        {/* Hint */}
        <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          Try: "Chennai Airport", "T Nagar", "Marina Beach", "Tambaram", "OMR", "Velachery", "Guindy"
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <span className="shrink-0 font-bold">!</span> {error}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="space-y-3">
            {/* Main result */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                <Trophy className="h-3.5 w-3.5" />
                {TYPE_LABEL[result.recommended_type] ?? "Route Result"}
                <span className="ml-auto text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {result.confidence}% confidence
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-display text-2xl font-bold">{result.travel_min}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">min ETA</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">{result.distance_km}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">km</div>
                </div>
                <div>
                  <div className={`font-display text-2xl font-bold ${delayColor(result.traffic_delay_min)}`}>
                    +{result.traffic_delay_min}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">min delay</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {result.fuel_l} L</span>
                <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> {result.co2_kg} kg CO₂</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                  {new Date(Date.now() + result.travel_min * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ETA
                </span>
              </div>

              {/* Route path */}
              <div className="mt-3 border-t border-border/60 pt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-green-400 shrink-0" />
                  <span className="truncate capitalize">{result.origin.name}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-1.5">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate capitalize">{result.destination.name}</span>
                </div>
              </div>
            </div>

            {/* Turn-by-turn */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Turn-by-turn</div>
              <ol className="space-y-2">
                {result.steps.map((step, i) => (
                  <li key={i} className={`flex items-start gap-2.5 text-sm transition ${
                    i === activeStep ? "text-primary font-medium" : i < activeStep ? "text-muted-foreground line-through opacity-50" : ""}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${
                      i === activeStep ? "border-primary bg-primary/20 text-primary" :
                      i < activeStep  ? "border-border bg-secondary/40 text-muted-foreground" :
                      "border-border text-muted-foreground"}`}>
                      {i < activeStep ? "✓" : i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Alternatives */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">All alternatives</div>
              <div className="space-y-1.5">
                {Object.entries(result.all_routes).map(([key, r]) => (
                  <div key={key}
                    onClick={() => { setSelectedType(key); findRoute(); }}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition hover:bg-primary/5 ${
                      key === result.recommended_type ? "bg-primary/10 border border-primary/30" : "bg-secondary/40"}`}>
                    <span className="font-medium capitalize">{key.replace("-", " ")}</span>
                    <div className="flex gap-3 text-muted-foreground">
                      <span className="font-mono">{r.travel_min} min</span>
                      <span>{r.distance_km} km</span>
                      <span className={delayColor(r.traffic_delay_min)}>+{r.traffic_delay_min}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Map panel ── */}
      <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-secondary/40">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <RouteMap result={result} />
      </div>
    </div>
  );
}
