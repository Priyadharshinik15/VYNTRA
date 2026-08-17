"""
Road ranking and the congestion gauge come straight from real TomTom data
(same source as the map). The short-term trend line is a labeled simulation:
a real trend needs historical samples collected over time, which this app
doesn't persist yet. `_simulate_trend()` is the swap point — once you're
storing samples (see note in README), replace it with an actual XGBoost
forecast and keep the same return shape.
"""
import random

from app.services.traffic_service import get_traffic


def _simulate_trend(current_score: int, steps: int = 12) -> list[dict]:
    trend = []
    score = current_score
    for i in range(steps):
        score = max(0, min(100, score + random.uniform(-4, 4)))
        trend.append({"t": f"+{(i + 1) * 5}m", "score": round(score)})
    return trend


async def get_prediction() -> dict:
    traffic = await get_traffic()
    roads = traffic.get("roads", [])
    average_score = traffic.get("average_score") or 0

    ranking = sorted(
        [r for r in roads if "score" in r],
        key=lambda r: r["score"],
        reverse=True,
    )

    return {
        "source": "tomtom+simulated_trend",
        "average_score": average_score,
        "level": (
            "free-flow" if average_score < 25
            else "moderate" if average_score < 50
            else "heavy" if average_score < 75
            else "critical"
        ),
        "road_ranking": ranking,
        "trend": _simulate_trend(average_score),
        "trend_is_simulated": True,
    }
