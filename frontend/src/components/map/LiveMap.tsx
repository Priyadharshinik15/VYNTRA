import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { RoadTraffic } from "@/services/api";

// Free, keyless vector/raster tiles. Swap for a MapTiler/Stadia style URL
// (with your own key) for higher zoom limits or custom styling.
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const LEVEL_COLOR: Record<string, string> = {
  "free-flow": "#22c55e",
  moderate: "#eab308",
  heavy: "#f97316",
  critical: "#ef4444",
};

type LiveMapProps = {
  roads: RoadTraffic[];
  centerLat: number;
  centerLon: number;
  showHeatmap?: boolean;
  className?: string;
};

export function LiveMap({ roads, centerLat, centerLon, showHeatmap = false, className }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [centerLon, centerLat],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    roads.forEach((road) => {
      if (road.error) return;
      const color = LEVEL_COLOR[road.level ?? ""] ?? "#94a3b8";
      const size = showHeatmap ? Math.max(16, (road.score ?? 30) / 2) : 16;
      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.background = color;
      el.style.border = "2px solid white";
      el.style.boxShadow = showHeatmap
        ? `0 0 ${size}px ${color}80`
        : "0 0 8px rgba(0,0,0,0.4)";
      el.style.opacity = showHeatmap ? "0.75" : "1";

      const popup = new maplibregl.Popup({ offset: 14 }).setHTML(
        `<strong>${road.name}</strong><br/>
         ${road.current_speed_kph ?? "?"} km/h (free-flow ${road.free_flow_speed_kph ?? "?"} km/h)<br/>
         Congestion: ${road.level ?? "unknown"} (${road.score ?? "?"})`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([road.lon, road.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [roads, showHeatmap]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
