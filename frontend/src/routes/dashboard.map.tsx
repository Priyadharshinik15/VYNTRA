import { createFileRoute } from "@tanstack/react-router";
import { MapPinned, Layers, Locate, Search, CloudRain, Activity, Brain, Thermometer } from "lucide-react";
import { useState, useCallback } from "react";

import { LiveMap } from "@/components/map/LiveMap";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/map")({
  head: () => ({ meta: [{ title: "Live Map · TrafficOps AI" }] }),
  component: LiveMapPage,
});

type LayerKey = "traffic" | "heatmap" | "weather" | "prediction";

const LAYERS: { key: LayerKey; label: string; icon: React.ElementType }[] = [
  { key: "traffic",    label: "Traffic",    icon: Layers },
  { key: "heatmap",   label: "Heatmap",    icon: Activity },
  { key: "weather",   label: "Weather",    icon: CloudRain },
  { key: "prediction",label: "Prediction", icon: Brain },
];

function LiveMapPage() {
  const { traffic, weather, prediction, status } = useLiveData();
  const roads = traffic?.roads ?? [];
  const [center, setCenter] = useState({ lat: 13.0827, lon: 80.2707 });
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(["traffic"]));

  const toggleLayer = useCallback((key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
  }

  // Filter roads by search query
  const filteredRoads = search.trim()
    ? roads.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : roads;

  // Build overlay info panel based on active layers
  const overlayItems: { label: string; value: string; color?: string }[] = [];

  if (activeLayers.has("weather") && weather) {
    overlayItems.push({ label: "Weather", value: `${weather.temp_c}°C · ${weather.condition}` });
    if (weather.rain_mm > 0)
      overlayItems.push({ label: "Rain", value: `${weather.rain_mm} mm/h`, color: "#60a5fa" });
    overlayItems.push({ label: "Wind", value: `${weather.wind_kph} km/h` });
  }

  if (activeLayers.has("prediction") && prediction) {
    overlayItems.push({
      label: "Congestion",
      value: `${prediction.average_score}% · ${prediction.level}`,
      color: prediction.level === "critical" ? "#ef4444" :
             prediction.level === "heavy"    ? "#f97316" :
             prediction.level === "moderate" ? "#eab308" : "#22c55e",
    });
  }

  if (activeLayers.has("traffic") && traffic) {
    const avg = traffic.roads.reduce((s, r) => s + (r.current_speed_kph ?? 0), 0) / Math.max(traffic.roads.length, 1);
    overlayItems.push({ label: "Avg speed", value: `${Math.round(avg)} km/h` });
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter roads…"
            className="h-9 w-full rounded-md border border-input bg-secondary/50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={useMyLocation}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent/50 transition-colors"
        >
          <Locate className="h-4 w-4" /> My location
        </button>

        {LAYERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors ${
              activeLayers.has(key)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${status === "live" ? "bg-success" : status === "offline" ? "bg-destructive" : "bg-warning"}`}
            style={status === "live" ? { animation: "pulse-dot 1.5s infinite" } : undefined}
          />
          {status === "live" ? "Live" : status === "connecting" ? "Connecting…" : status === "reconnecting" ? "Reconnecting…" : "Offline"}
        </span>
      </div>

      {/* Map + overlay */}
      <div className="relative h-[calc(100vh-14rem)] overflow-hidden rounded-xl border border-border bg-secondary/40">
        {filteredRoads.length > 0 ? (
          <LiveMap
            roads={filteredRoads}
            centerLat={center.lat}
            centerLon={center.lon}
            showHeatmap={activeLayers.has("heatmap")}
            className="h-full w-full"
          />
        ) : (
          <>
            <div className="absolute inset-0 grid-bg opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPinned className="mx-auto mb-2 h-10 w-10 text-primary" />
                <div className="font-display text-lg font-semibold">
                  {search ? `No roads matching "${search}"` : (traffic?.message ?? "Loading live traffic…")}
                </div>
                <div className="text-sm text-muted-foreground">MapLibre GL JS + OpenStreetMap</div>
              </div>
            </div>
          </>
        )}

        {/* Overlay info panel */}
        {overlayItems.length > 0 && (
          <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-card/90 p-3 backdrop-blur text-xs space-y-1 min-w-40">
            {overlayItems.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium" style={item.color ? { color: item.color } : undefined}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Road list panel (heatmap mode) */}
        {activeLayers.has("heatmap") && filteredRoads.length > 0 && (
          <div className="absolute top-4 right-4 rounded-xl border border-border bg-card/90 p-3 backdrop-blur text-xs space-y-1.5 min-w-48 max-h-64 overflow-y-auto">
            <div className="font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Heatmap</div>
            {filteredRoads.map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      r.level === "free-flow" ? "#22c55e" :
                      r.level === "moderate"  ? "#eab308" :
                      r.level === "heavy"     ? "#f97316" : "#ef4444",
                  }}
                />
                <span className="truncate text-muted-foreground">{r.name}</span>
                <span className="ml-auto font-mono">{r.score ?? "?"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
