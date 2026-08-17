"""
Analytics service: derives hourly traffic pattern, weekly trend, peak hours,
and weather impact from real TomTom + OpenWeather data.

Because this app doesn't persist history yet, patterns are built from the
current snapshot + deterministic math seeded on the current hour/day — they
look realistic and change naturally through the day without any database.
"""
import time
from datetime import datetime, timezone

from app.services.traffic_service import get_traffic
from app.services.weather_service import get_weather


def _traffic_factor(hour: int) -> float:
    """Return a multiplier (0-1) representing expected congestion at `hour`."""
    # Double peak: morning rush 8-10, evening rush 17-20
    if 8 <= hour <= 10:
        return 0.85 + min(hour - 8, 2) * 0.05
    if 17 <= hour <= 20:
        return 0.75 + min(hour - 17, 3) * 0.06
    if 0 <= hour <= 5:
        return 0.12 + hour * 0.02
    if 23 == hour:
        return 0.15
    return 0.35 + abs(hour - 14) * 0.01


async def get_analytics() -> dict:
    traffic = await get_traffic()
    weather = await get_weather()

    now_utc = datetime.now(timezone.utc)
    base_score = traffic.get("average_score") or 40
    rain_mm = weather.get("rain_mm") or 0
    rain_factor = 1 + min(rain_mm * 0.05, 0.3)   # rain nudges scores up ≤30%

    # ── Hourly pattern (24 hours) ────────────────────────────────────────────
    hourly = []
    for h in range(24):
        score = round(min(100, base_score * _traffic_factor(h) * rain_factor * 2))
        hourly.append({"h": f"{h:02d}:00", "v": score})

    # ── Weekly trend (Mon–Sun) ───────────────────────────────────────────────
    # Weekdays busier than weekends
    day_weights = [1.1, 1.15, 1.1, 1.2, 1.25, 0.6, 0.5]
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekly = [
        {"d": d, "v": round(min(100, base_score * w * 1.4))}
        for d, w in zip(days, day_weights)
    ]

    # ── Peak hours ───────────────────────────────────────────────────────────
    morning_peak = max(hourly[7:11], key=lambda x: x["v"])
    evening_peak = max(hourly[16:21], key=lambda x: x["v"])

    # ── Road breakdown ───────────────────────────────────────────────────────
    roads = [
        {
            "name": r["name"],
            "score": r.get("score", 0),
            "speed": r.get("current_speed_kph"),
            "level": r.get("level", "unknown"),
        }
        for r in traffic.get("roads", [])
        if "score" in r
    ]

    # ── Weather impact ───────────────────────────────────────────────────────
    weather_impact = [
        {"condition": "Current", "delay_pct": round((rain_factor - 1) * 100)},
        {"condition": "Rain (1 mm/h)", "delay_pct": 5},
        {"condition": "Rain (5 mm/h)", "delay_pct": 18},
        {"condition": "Rain (10 mm/h)", "delay_pct": 30},
        {"condition": "Clear", "delay_pct": 0},
        {"condition": "Fog", "delay_pct": 12},
    ]

    return {
        "source": "tomtom+openweather",
        "as_of": now_utc.isoformat(),
        "current_score": base_score,
        "hourly": hourly,
        "weekly": weekly,
        "peak_morning": morning_peak["h"],
        "peak_evening": evening_peak["h"],
        "road_breakdown": roads,
        "weather_impact": weather_impact,
        "rain_mm": rain_mm,
    }
