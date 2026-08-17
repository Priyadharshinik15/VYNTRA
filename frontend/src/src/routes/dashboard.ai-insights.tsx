import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, Bot, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { useLiveData } from "@/hooks/useLiveData";

export const Route = createFileRoute("/dashboard/ai-insights")({
  head: () => ({ meta: [{ title: "AI Insights · TrafficOps AI" }] }),
  component: AIInsights,
});

type Message = { from: "user" | "ai"; text: string; ts: Date };

// ── Smart response engine ────────────────────────────────────────────────────
function buildAnswers(weather: ReturnType<typeof useLiveData>["weather"],
                      traffic: ReturnType<typeof useLiveData>["traffic"],
                      prediction: ReturnType<typeof useLiveData>["prediction"]) {
  const roads = prediction?.road_ranking ?? [];
  const worstRoads = roads.filter((r) => r.level === "heavy" || r.level === "critical");
  const clearRoads = roads.filter((r) => r.level === "free-flow");
  const rain = weather?.rain_mm ?? 0;
  const avgScore = prediction?.average_score ?? 0;
  const level = prediction?.level ?? "unknown";

  return function respond(q: string): string {
    const lower = q.toLowerCase();

    // — avoid / worst —
    if (lower.includes("avoid") || lower.includes("worst") || lower.includes("bad")) {
      if (worstRoads.length === 0)
        return `All tracked roads are clear right now (overall score ${avgScore}%). Good time to travel.`;
      const names = worstRoads.map((r) => `${r.name} (${r.score}%, ${r.current_speed_kph} km/h)`).join("; ");
      return `Avoid: ${names}. ${rain > 0 ? `Rain of ${rain} mm/h is making conditions worse.` : ""}`;
    }

    // — why / cause / reason —
    if (lower.includes("why") || lower.includes("cause") || lower.includes("reason")) {
      const parts: string[] = [];
      if (rain > 0) parts.push(`rain at ${rain} mm/h is slowing wet roads`);
      worstRoads.forEach((r) => {
        const ratio = r.free_flow_speed_kph ? Math.round((r.current_speed_kph ?? 0) / r.free_flow_speed_kph * 100) : 0;
        parts.push(`${r.name} running at only ${ratio}% of free-flow speed`);
      });
      if (parts.length === 0) return "No significant cause detected — traffic is within normal range right now.";
      return `Key causes: ${parts.join("; ")}.`;
    }

    // — best / clear / good —
    if (lower.includes("best") || lower.includes("clear") || lower.includes("good") || lower.includes("fastest")) {
      if (clearRoads.length === 0)
        return `No free-flow roads right now. ${roads[roads.length - 1]?.name ?? "All roads"} has the lowest congestion.`;
      const names = clearRoads.map((r) => r.name).join(", ");
      return `Clearest roads: ${names}. ${rain === 0 ? "Weather is clear too." : `Note: it's raining (${rain} mm/h).`}`;
    }

    // — weather —
    if (lower.includes("weather") || lower.includes("rain") || lower.includes("temp")) {
      if (!weather) return "Weather data is loading…";
      const w = weather;
      return `Currently ${w.temp_c}°C, ${w.description ?? w.condition}. Wind ${w.wind_kph} km/h, humidity ${w.humidity}%.${
        rain > 0 ? ` Rain: ${rain} mm/h — expect delays on tracked roads.` : " No rain."
      }`;
    }

    // — score / congestion / overall —
    if (lower.includes("score") || lower.includes("congestion") || lower.includes("overall") || lower.includes("status")) {
      return `Overall congestion score: ${avgScore}% (${level}). ${
        worstRoads.length > 0
          ? `${worstRoads.length} road(s) are heavy/critical.`
          : "All roads within normal range."
      }`;
    }

    // — prediction / forecast / next —
    if (lower.includes("predict") || lower.includes("forecast") || lower.includes("next") || lower.includes("later")) {
      const trend = prediction?.trend ?? [];
      if (trend.length === 0) return "Trend data not available yet.";
      const first = trend[0];
      const last = trend[trend.length - 1];
      const dir = last.score > first.score ? "worsening" : last.score < first.score ? "improving" : "stable";
      return `Short-term trend: ${dir}. In ${first.t} → ${first.score}%, in ${last.t} → ${last.score}%. (Simulated until real history is collected.)`;
    }

    // — speed —
    if (lower.includes("speed")) {
      if (!traffic?.roads?.length) return "Traffic speed data loading…";
      const fastest = [...traffic.roads].sort((a, b) => (b.current_speed_kph ?? 0) - (a.current_speed_kph ?? 0))[0];
      const slowest = [...traffic.roads].sort((a, b) => (a.current_speed_kph ?? 0) - (b.current_speed_kph ?? 0))[0];
      return `Fastest: ${fastest.name} at ${fastest.current_speed_kph} km/h. Slowest: ${slowest.name} at ${slowest.current_speed_kph} km/h.`;
    }

    // — help —
    if (lower.includes("help") || lower.includes("what can")) {
      return "Ask me: Why is traffic heavy? Which roads to avoid? What's the weather? Overall status? Speed? Predictions? Best route right now?";
    }

    // fallback
    if (roads[0]) {
      return `Current hotspot: ${roads[0].name} with ${roads[0].score}% congestion at ${roads[0].current_speed_kph} km/h. Try asking: why, avoid, weather, or status.`;
    }
    return "Still loading live data. Try again in a moment.";
  };
}

function TrendIcon({ score }: { score: number }) {
  if (score < 30) return <TrendingDown className="h-3.5 w-3.5 text-green-400" />;
  if (score > 65) return <TrendingUp className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-400" />;
}

export function AIInsights() {
  const { weather, traffic, prediction } = useLiveData();
  const respond = useMemo(
    () => buildAnswers(weather, traffic, prediction),
    [weather, traffic, prediction],
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ai",
      text: "Hi! I'm your AI traffic copilot. Ask me: Which roads to avoid? Why is traffic heavy? What's the weather impact? What's the congestion score?",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const worst = prediction?.road_ranking?.[0];
  const rain = weather?.rain_mm ?? 0;
  const avgScore = prediction?.average_score ?? 0;

  function send(text: string) {
    if (!text.trim()) return;
    const answer = respond(text.trim());
    setMessages((m) => [
      ...m,
      { from: "user", text: text.trim(), ts: new Date() },
      { from: "ai", text: answer, ts: new Date() },
    ]);
    setInput("");
  }

  const suggestions = [
    "Why is traffic heavy?",
    "Which roads to avoid?",
    "What's the overall status?",
    "Speed report",
    "Weather impact",
    "Short-term prediction",
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* ── Left: Insight cards ── */}
      <div className="space-y-4">
        {/* Summary hero */}
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" /> AI Traffic Summary
          </div>
          {worst ? (
            <>
              <p className="text-lg leading-snug">
                <span className="font-bold" style={{ color: worst.level === "critical" ? "#ef4444" : worst.level === "heavy" ? "#f97316" : "#eab308" }}>
                  {worst.name}
                </span>{" "}
                is the current hotspot at{" "}
                <span className="font-bold">{worst.score}%</span> congestion
                {worst.current_speed_kph ? ` (${worst.current_speed_kph} km/h)` : ""}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Overall: {avgScore}% · {prediction?.level}.
                {rain > 0 ? ` Rain ${rain} mm/h is adding ~${Math.min(30, Math.round(rain * 5))}% delay.` : " No rain."}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Loading live traffic data…</p>
          )}
        </div>

        {/* Road status grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(prediction?.road_ranking ?? []).map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.current_speed_kph ?? "?"} km/h · ff {r.free_flow_speed_kph ?? "?"} km/h
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <TrendIcon score={r.score ?? 0} />
                  <span
                    className="font-display text-lg font-bold"
                    style={{
                      color:
                        r.level === "free-flow" ? "#22c55e" :
                        r.level === "moderate"  ? "#eab308" :
                        r.level === "heavy"     ? "#f97316" : "#ef4444",
                    }}
                  >
                    {r.score ?? "—"}%
                  </span>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: r.level === "free-flow" ? "#22c55e20" : r.level === "moderate" ? "#eab30820" : r.level === "heavy" ? "#f9731620" : "#ef444420",
                    color: r.level === "free-flow" ? "#22c55e" : r.level === "moderate" ? "#eab308" : r.level === "heavy" ? "#f97316" : "#ef4444",
                  }}
                >
                  {r.level}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display font-semibold mb-2">Suggested actions</h3>
            <ul className="space-y-1.5 text-sm">
              {(prediction?.road_ranking ?? [])
                .filter((r) => r.level === "heavy" || r.level === "critical")
                .map((r) => (
                  <li key={r.name} className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-orange-400 shrink-0" />
                    Use alternative to {r.name}
                  </li>
                ))}
              {(prediction?.road_ranking ?? []).every((r) => r.level !== "heavy" && r.level !== "critical") && (
                <li className="text-muted-foreground">No reroutes needed — all roads normal.</li>
              )}
              {rain > 0 && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                  Allow extra time for rain delays
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display font-semibold mb-2">Quick Q&amp;A</h3>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Copilot chat ── */}
      <aside className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Bot className="h-4 w-4 text-primary" />
          <div className="font-semibold">AI Copilot</div>
          <span className="ml-auto flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Live data
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-3 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${m.from === "ai" ? "bg-secondary/60" : "bg-primary/10 ml-4"}`}
            >
              {m.from === "user" && <span className="font-semibold text-primary text-xs">You · </span>}
              {m.from === "ai" && <span className="font-semibold text-xs text-muted-foreground">Copilot · </span>}
              {m.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about traffic…"
              className="h-9 flex-1 rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
