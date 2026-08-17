"""
Alerts are derived from the same real traffic + weather data the map and
weather pages use — there's no separate "incidents" feed here (a real one,
like TomTom Incidents or a city's open-data feed, is the natural next
upgrade; ask me to wire it in when you're ready).
"""
from app.services.traffic_service import get_traffic
from app.services.weather_service import get_weather


async def get_alerts() -> dict:
    traffic = await get_traffic()
    weather = await get_weather()

    alerts = []

    for road in traffic.get("roads", []):
        level = road.get("level")
        if level in ("heavy", "critical"):
            alerts.append(
                {
                    "type": "traffic",
                    "severity": "danger" if level == "critical" else "signal",
                    "title": f"{'Heavy' if level == 'heavy' else 'Critical'} congestion · {road['name']}",
                    "detail": f"{road.get('current_speed_kph', '?')} km/h "
                    f"(free-flow {road.get('free_flow_speed_kph', '?')} km/h)",
                }
            )

    rain_mm = weather.get("rain_mm") or 0
    if rain_mm > 0:
        alerts.append(
            {
                "type": "weather",
                "severity": "accent",
                "title": "Rain detected",
                "detail": f"{rain_mm} mm/h — expect slower speeds on tracked roads.",
            }
        )

    if not alerts:
        alerts.append(
            {
                "type": "status",
                "severity": "primary",
                "title": "No active alerts",
                "detail": "Traffic and weather are within normal ranges on tracked roads.",
            }
        )

    return {"source": "derived", "alerts": alerts}
