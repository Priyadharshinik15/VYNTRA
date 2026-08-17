/**
 * useLiveData — provides live-looking traffic data.
 * Tries the backend WebSocket first; if unavailable, falls back to
 * realistic hardcoded data that animates on a timer so the UI always works.
 */
import { useEffect, useRef, useState } from "react";
import {
  api,
  type AlertsData,
  type LiveUpdate,
  type PredictionData,
  type TrafficData,
  type WeatherData,
} from "@/services/api";

type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

// ── Realistic hardcoded fallback data ────────────────────────────────────────
const ROADS_BASE = [
  { name: "OMR - Sholinganallur",   lat: 12.9010, lon: 80.2279, freeFlow: 60 },
  { name: "GST Road - Tambaram",    lat: 12.9249, lon: 80.1000, freeFlow: 55 },
  { name: "Anna Salai - Teynampet", lat: 13.0418, lon: 80.2417, freeFlow: 50 },
  { name: "ECR - Neelankarai",      lat: 12.9500, lon: 80.2580, freeFlow: 65 },
];

function getSimulatedSpeeds() {
  const hour = new Date().getHours();
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  return ROADS_BASE.map((r, i) => {
    const base = isPeak ? 0.35 + Math.random() * 0.3 : 0.6 + Math.random() * 0.35;
    const ratio = Math.max(0.15, Math.min(1, base + Math.sin(Date.now() / 30000 + i) * 0.08));
    const current = Math.round(r.freeFlow * ratio);
    const score = Math.min(100, Math.round((1 - ratio) * 100));
    const level =
      score < 25 ? "free-flow" :
      score < 50 ? "moderate" :
      score < 75 ? "heavy" : "critical";
    return {
      name: r.name, lat: r.lat, lon: r.lon,
      current_speed_kph: current,
      free_flow_speed_kph: r.freeFlow,
      confidence: 0.92,
      score, level,
      speed_ratio: Math.round(ratio * 100) / 100,
    };
  });
}

function buildFallback(): Omit<LiveUpdate, "type"> {
  const roads = getSimulatedSpeeds();
  const avgScore = Math.round(roads.reduce((s, r) => s + r.score, 0) / roads.length);
  const level =
    avgScore < 25 ? "free-flow" :
    avgScore < 50 ? "moderate" :
    avgScore < 75 ? "heavy" : "critical";

  const weather: WeatherData = {
    source: "demo",
    temp_c: 29 + Math.round(Math.random() * 3),
    feels_like_c: 33,
    humidity: 72,
    condition: "Partly Cloudy",
    description: "partly cloudy skies",
    wind_kph: 14,
    rain_mm: 0,
    visibility_m: 8000,
  };

  const traffic: TrafficData = {
    source: "demo",
    roads,
    average_score: avgScore,
  };

  const alertsList = roads
    .filter((r) => r.level === "heavy" || r.level === "critical")
    .map((r) => ({
      type: "traffic",
      severity: r.level === "critical" ? "danger" : "signal",
      title: `${r.level === "critical" ? "Critical" : "Heavy"} congestion · ${r.name}`,
      detail: `${r.current_speed_kph} km/h (free-flow ${r.free_flow_speed_kph} km/h)`,
    }));

  if (alertsList.length === 0) {
    alertsList.push({
      type: "status",
      severity: "primary",
      title: "Traffic flowing normally",
      detail: "All tracked roads are within normal speed range.",
    });
  }

  const alerts: AlertsData = { source: "demo", alerts: alertsList };

  const trend = Array.from({ length: 12 }, (_, i) => ({
    t: `+${(i + 1) * 5}m`,
    score: Math.max(0, Math.min(100, avgScore + Math.round((Math.random() - 0.5) * 12))),
  }));

  const prediction: PredictionData = {
    source: "demo",
    average_score: avgScore,
    level,
    road_ranking: [...roads].sort((a, b) => b.score - a.score),
    trend,
    trend_is_simulated: true,
  };

  return { weather, traffic, alerts, prediction };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLiveData() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const retryRef = useRef(0);
  const usingFallback = useRef(false);

  // Always seed with fallback immediately so UI renders on first frame
  useEffect(() => {
    const seed = buildFallback();
    setWeather(seed.weather);
    setTraffic(seed.traffic);
    setAlerts(seed.alerts);
    setPrediction(seed.prediction);
  }, []);

  // Refresh simulated data every 5 s when backend is offline
  useEffect(() => {
    if (!usingFallback.current) return;
    const id = setInterval(() => {
      const d = buildFallback();
      setWeather(d.weather);
      setTraffic(d.traffic);
      setAlerts(d.alerts);
      setPrediction(d.prediction);
    }, 5000);
    return () => clearInterval(id);
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function connect() {
      try {
        socket = new WebSocket(api.liveSocketUrl());

        socket.onopen = () => {
          retryRef.current = 0;
          usingFallback.current = false;
          setStatus("live");
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as LiveUpdate;
            if (payload.type === "live_update") {
              setWeather(payload.weather);
              setTraffic(payload.traffic);
              setAlerts(payload.alerts);
              setPrediction(payload.prediction);
            }
          } catch { /* ignore parse errors */ }
        };

        socket.onclose = () => {
          if (cancelled) return;
          usingFallback.current = true;
          setStatus("reconnecting");
          const delay = Math.min(1000 * 2 ** retryRef.current, 15000);
          retryRef.current += 1;
          retryTimeout = setTimeout(connect, delay);
        };

        socket.onerror = () => {
          usingFallback.current = true;
          socket?.close();
        };
      } catch {
        usingFallback.current = true;
        setStatus("offline");
      }
    }

    // Try REST fallback first, silently ignore errors
    Promise.allSettled([
      api.getWeather(),
      api.getTraffic(),
      api.getAlerts(),
      api.getPrediction(),
    ]).then(([w, t, a, p]) => {
      if (cancelled) return;
      let anyLive = false;
      if (w.status === "fulfilled") { setWeather(w.value); anyLive = true; }
      if (t.status === "fulfilled") { setTraffic(t.value); anyLive = true; }
      if (a.status === "fulfilled") { setAlerts(a.value); anyLive = true; }
      if (p.status === "fulfilled") { setPrediction(p.value); anyLive = true; }
      if (!anyLive) {
        usingFallback.current = true;
        setStatus("offline");
      }
    });

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      socket?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive a user-friendly status
  const displayStatus: ConnectionStatus =
    usingFallback.current ? "offline" : status;

  return { weather, traffic, alerts, prediction, status: displayStatus };
}
