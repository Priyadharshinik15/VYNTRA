const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type WeatherData = {
  source: string;
  temp_c: number | null;
  feels_like_c?: number;
  humidity: number | null;
  condition: string;
  description?: string;
  wind_kph: number | null;
  rain_mm: number;
  visibility_m?: number;
  message?: string;
};

export type ForecastStep = { time: string; temp_c: number; condition: string; rain_mm: number };
export type ForecastData = { source: string; steps: ForecastStep[] };

export type RoadTraffic = {
  name: string;
  lat: number;
  lon: number;
  current_speed_kph?: number;
  free_flow_speed_kph?: number;
  confidence?: number;
  score?: number;
  level?: "free-flow" | "moderate" | "heavy" | "critical";
  speed_ratio?: number;
  error?: string;
};

export type TrafficData = {
  source: string;
  roads: RoadTraffic[];
  average_score?: number;
  message?: string;
};

export type RouteResult = {
  source: string;
  travel_min?: number;
  distance_km?: number;
  traffic_delay_min?: number;
  fuel_l?: number;
  co2_kg?: number;
  confidence?: number;
  departure_time?: string;
  arrival_time?: string;
  traffic_length_m?: number;
  recommended_type?: string;
  all_routes?: Record<string, Omit<RouteResult, "all_routes" | "source" | "origin" | "destination">>;
  origin?: { name: string; lat: number; lon: number };
  destination?: { name: string; lat: number; lon: number };
  error?: string;
};

export type AnalyticsData = {
  source: string;
  as_of: string;
  current_score: number;
  hourly: { h: string; v: number }[];
  weekly: { d: string; v: number }[];
  peak_morning: string;
  peak_evening: string;
  road_breakdown: { name: string; score: number; speed: number | null; level: string }[];
  weather_impact: { condition: string; delay_pct: number }[];
  rain_mm: number;
};

export type CityData = {
  name: string;
  lat: number;
  lon: number;
  temp_c: number | null;
  condition: string;
  rain_mm: number;
  current_speed_kph: number | null;
  free_flow_speed_kph: number | null;
  congestion_score: number | null;
  level: string;
  incidents: number;
};

export type CitiesData = {
  source: string;
  best_city: string;
  cities: CityData[];
};

export type ModelData = {
  source: string;
  model_version: string;
  accuracy_pct: number;
  mae: number;
  rmse: number;
  road_count: number;
  actuals: number[];
  predictions: number[];
  road_labels: string[];
  psi: number;
  drift_status: string;
  history_snapshots: number;
  feature_importance: { feature: string; importance: number }[];
};

export type Alert = { type: string; severity: string; title: string; detail: string };
export type AlertsData = { source: string; alerts: Alert[] };

export type PredictionData = {
  source: string;
  average_score: number;
  level: string;
  road_ranking: RoadTraffic[];
  trend: { t: string; score: number }[];
  trend_is_simulated: boolean;
};

export type LiveUpdate = {
  type: "live_update";
  weather: WeatherData;
  traffic: TrafficData;
  alerts: AlertsData;
  prediction: PredictionData;
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getWeather: (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set("lat", String(lat));
    if (lon !== undefined) params.set("lon", String(lon));
    return fetch(`${API_URL}/api/weather?${params}`).then((r) => handle<WeatherData>(r));
  },
  getForecast: () => fetch(`${API_URL}/api/weather/forecast`).then((r) => handle<ForecastData>(r)),
  getTraffic: () => fetch(`${API_URL}/api/traffic`).then((r) => handle<TrafficData>(r)),
  getAlerts: () => fetch(`${API_URL}/api/alerts`).then((r) => handle<AlertsData>(r)),
  getPrediction: () => fetch(`${API_URL}/api/prediction`).then((r) => handle<PredictionData>(r)),
  getRoute: (origin: string, destination: string, routeType = "ai") => {
    const params = new URLSearchParams({ origin, destination, route_type: routeType });
    return fetch(`${API_URL}/api/route?${params}`).then((r) => handle<RouteResult>(r));
  },
  getAnalytics: () => fetch(`${API_URL}/api/analytics`).then((r) => handle<AnalyticsData>(r)),
  getCities: () => fetch(`${API_URL}/api/cities`).then((r) => handle<CitiesData>(r)),
  getModel: () => fetch(`${API_URL}/api/model`).then((r) => handle<ModelData>(r)),
  liveSocketUrl: () => `${API_URL.replace(/^http/, "ws")}/ws/live`,
};
