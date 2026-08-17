"""
Real weather data from OpenWeather's One Call / current-weather endpoint.
Cached in memory so we don't re-hit the API more often than
WEATHER_REFRESH_SECONDS, regardless of how many browsers are connected.
"""
import time

import httpx

from app.core.config import settings

_cache: dict = {}
_cache_time: float = 0.0


async def get_weather(lat: float | None = None, lon: float | None = None) -> dict:
    global _cache, _cache_time

    lat = lat if lat is not None else settings.DEFAULT_LAT
    lon = lon if lon is not None else settings.DEFAULT_LON

    now = time.time()
    if _cache and (now - _cache_time) < settings.WEATHER_REFRESH_SECONDS:
        return _cache

    if not settings.OPENWEATHER_API_KEY:
        # No key configured yet — return a clearly-labeled placeholder so the
        # frontend has something to render instead of a broken request.
        return {
            "source": "placeholder",
            "message": "Set OPENWEATHER_API_KEY in backend/.env to get real data",
            "temp_c": None,
            "condition": "unknown",
            "rain_mm": 0,
            "wind_kph": None,
            "humidity": None,
        }

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    result = {
        "source": "openweather",
        "fetched_at": now,
        "temp_c": data["main"]["temp"],
        "feels_like_c": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "condition": data["weather"][0]["main"],
        "description": data["weather"][0]["description"],
        "wind_kph": round(data["wind"]["speed"] * 3.6, 1),
        "rain_mm": data.get("rain", {}).get("1h", 0),
        "visibility_m": data.get("visibility"),
    }

    _cache = result
    _cache_time = now
    return result


_forecast_cache: dict = {}
_forecast_cache_time: float = 0.0


async def get_forecast(lat: float | None = None, lon: float | None = None) -> dict:
    """
    Real forecast data from OpenWeather's free 5-day/3-hour endpoint. This is
    genuinely predicted weather (not simulated) — just at 3-hour resolution,
    which is what the free tier offers.
    """
    global _forecast_cache, _forecast_cache_time

    lat = lat if lat is not None else settings.DEFAULT_LAT
    lon = lon if lon is not None else settings.DEFAULT_LON

    now = time.time()
    if _forecast_cache and (now - _forecast_cache_time) < settings.WEATHER_REFRESH_SECONDS:
        return _forecast_cache

    if not settings.OPENWEATHER_API_KEY:
        return {"source": "placeholder", "steps": []}

    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric", "cnt": 6}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    steps = [
        {
            "time": item["dt_txt"],
            "temp_c": item["main"]["temp"],
            "condition": item["weather"][0]["main"],
            "rain_mm": item.get("rain", {}).get("3h", 0),
        }
        for item in data.get("list", [])
    ]

    result = {"source": "openweather", "fetched_at": now, "steps": steps}
    _forecast_cache = result
    _forecast_cache_time = now
    return result
