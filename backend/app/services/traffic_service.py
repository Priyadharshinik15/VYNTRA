"""
Real traffic speed data from TomTom's Traffic Flow API, for a fixed list of
road points (see TRACKED_ROAD_POINTS in config.py). Cached in memory so we
never exceed TRAFFIC_REFRESH_SECONDS calls per point per day.

Also computes a simple congestion score. This is the seam where you swap in
XGBoost later: replace `_congestion_score()` with a call to your trained
model and keep the same return shape — nothing else in the app needs to
change.
"""
import time

import httpx

from app.core.config import settings
from app.services.weather_service import get_weather

_cache: dict = {}
_cache_time: float = 0.0


def _congestion_score(current_speed: float, free_flow_speed: float, rain_mm: float) -> dict:
    """
    Rule-based placeholder for a real prediction model.

    ratio close to 1.0  -> free flowing
    ratio close to 0    -> gridlock
    Rain adds a bump to the score because wet roads slow traffic further
    than the raw speed ratio alone would suggest.
    """
    if free_flow_speed <= 0:
        ratio = 1.0
    else:
        ratio = max(0.0, min(1.0, current_speed / free_flow_speed))

    base_score = round((1 - ratio) * 100)
    rain_penalty = min(15, rain_mm * 3)  # heavier rain nudges the score up
    score = min(100, round(base_score + rain_penalty))

    if score < 25:
        level = "free-flow"
    elif score < 50:
        level = "moderate"
    elif score < 75:
        level = "heavy"
    else:
        level = "critical"

    return {"score": score, "level": level, "speed_ratio": round(ratio, 2)}


async def get_traffic() -> dict:
    global _cache, _cache_time

    now = time.time()
    if _cache and (now - _cache_time) < settings.TRAFFIC_REFRESH_SECONDS:
        return _cache

    weather = await get_weather()
    rain_mm = weather.get("rain_mm") or 0

    if not settings.TOMTOM_API_KEY:
        result = {
            "source": "placeholder",
            "message": "Set TOMTOM_API_KEY in backend/.env to get real data",
            "roads": [],
        }
        _cache = result
        _cache_time = now
        return result

    roads = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for point in settings.TRACKED_ROAD_POINTS:
            url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
            params = {"key": settings.TOMTOM_API_KEY, "point": f"{point['lat']},{point['lon']}"}
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                seg = resp.json()["flowSegmentData"]
                congestion = _congestion_score(
                    seg["currentSpeed"], seg["freeFlowSpeed"], rain_mm
                )
                roads.append(
                    {
                        "name": point["name"],
                        "lat": point["lat"],
                        "lon": point["lon"],
                        "current_speed_kph": seg["currentSpeed"],
                        "free_flow_speed_kph": seg["freeFlowSpeed"],
                        "confidence": seg.get("confidence"),
                        **congestion,
                    }
                )
            except httpx.HTTPError as exc:
                roads.append({"name": point["name"], "lat": point["lat"], "lon": point["lon"], "error": str(exc)})

    scored = [r["score"] for r in roads if "score" in r]
    average_score = round(sum(scored) / len(scored)) if scored else None

    result = {
        "source": "tomtom",
        "fetched_at": now,
        "roads": roads,
        "average_score": average_score,
    }
    _cache = result
    _cache_time = now
    return result
