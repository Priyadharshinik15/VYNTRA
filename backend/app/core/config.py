"""
Central config. All secrets come from environment variables — never hardcode
a key here. Copy backend/.env.example to backend/.env and fill in your own
values; python-dotenv loads it automatically in main.py.
"""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- Required: get your own free-tier key ---
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    TOMTOM_API_KEY: str = os.getenv("TOMTOM_API_KEY", "")

    # --- Defaults: Chennai. Change to whatever city you're demoing. ---
    DEFAULT_LAT: float = float(os.getenv("DEFAULT_LAT", "13.0827"))
    DEFAULT_LON: float = float(os.getenv("DEFAULT_LON", "80.2707"))

    # How often the backend is *allowed* to hit the real external APIs.
    # TomTom free tier = 2500 calls/day. If you poll every 60s for one
    # point, that's 1440 calls/day — safe. Don't drop this much below 60
    # without also reducing how many road points you track, or you'll burn
    # your quota fast.
    WEATHER_REFRESH_SECONDS: int = int(os.getenv("WEATHER_REFRESH_SECONDS", "300"))
    TRAFFIC_REFRESH_SECONDS: int = int(os.getenv("TRAFFIC_REFRESH_SECONDS", "60"))

    # How often cached data is pushed to connected browsers over the
    # WebSocket. This can be much shorter than the refresh interval above —
    # it's just re-sending the last known value, which is what makes the UI
    # feel live between real refreshes.
    BROADCAST_INTERVAL_SECONDS: int = int(os.getenv("BROADCAST_INTERVAL_SECONDS", "5"))

    # A handful of road points to track traffic for. Lat/lon pairs +
    # a human label. Add your own for whatever city/roads you're demoing.
    TRACKED_ROAD_POINTS: list[dict] = [
        {"name": "OMR - Sholinganallur", "lat": 12.9010, "lon": 80.2279},
        {"name": "GST Road - Tambaram", "lat": 12.9249, "lon": 80.1000},
        {"name": "Anna Salai - Teynampet", "lat": 13.0418, "lon": 80.2417},
        {"name": "ECR - Neelankarai", "lat": 12.9500, "lon": 80.2580},
    ]

    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


settings = Settings()
