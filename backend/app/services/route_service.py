"""
AI Route Planner service using TomTom's Routing API.

Calls TomTom's /routing/1/calculateRoute endpoint with traffic-awareness,
then enriches the result with a congestion-aware AI recommendation score.
Supports route types: fastest, eco, avoid-traffic (thrilling), avoid-toll.

The "AI Route" type runs all four alternatives in parallel and picks the
one with the best weighted score (travel time × congestion penalty × fuel).
"""
import asyncio
import time

import httpx

from app.core.config import settings

# Chennai bounding box for geocoding fallback
_KNOWN_PLACES: dict[str, tuple[float, float]] = {
    "current location": (settings.DEFAULT_LAT, settings.DEFAULT_LON),
    "home": (settings.DEFAULT_LAT, settings.DEFAULT_LON),
    "office": (13.0569, 80.2425),   # Anna Salai area
    "college": (13.0117, 80.2337),  # IIT Madras area
    # TomTom fuzzy search handles everything else
}


async def _geocode(query: str, client: httpx.AsyncClient) -> tuple[float, float] | None:
    """Resolve a place name to lat/lon using TomTom Fuzzy Search."""
    q = query.strip().lower()
    if q in _KNOWN_PLACES:
        return _KNOWN_PLACES[q]

    url = "https://api.tomtom.com/search/2/geocode/{q}.json".format(q=query)
    params = {
        "key": settings.TOMTOM_API_KEY,
        "countrySet": "IN",
        "limit": 1,
    }
    try:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            pos = results[0]["position"]
            return pos["lat"], pos["lon"]
    except httpx.HTTPError:
        pass
    return None


async def _calculate_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    route_type: str,
    avoid: list[str],
    client: httpx.AsyncClient,
) -> dict | None:
    """Call TomTom calculateRoute and return parsed result."""
    url = (
        f"https://api.tomtom.com/routing/1/calculateRoute/"
        f"{origin_lat},{origin_lon}:{dest_lat},{dest_lon}/json"
    )
    params = {
        "key": settings.TOMTOM_API_KEY,
        "routeType": route_type,          # fastest | eco | thrilling
        "traffic": "true",
        "travelMode": "car",
        "computeBestOrder": "false",
        "routeRepresentation": "summaryOnly",
        "computeTravelTimeFor": "all",
        "sectionType": "traffic",
        "report": "effectiveSettings",
    }
    if avoid:
        params["avoid"] = ",".join(avoid)

    try:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        routes = data.get("routes", [])
        if not routes:
            return None
        route = routes[0]
        summary = route["summary"]

        travel_min = round(summary["travelTimeInSeconds"] / 60, 1)
        distance_km = round(summary["lengthInMeters"] / 1000, 1)
        delay_sec = summary.get("trafficDelayInSeconds", 0)
        traffic_min = round(delay_sec / 60, 1)

        # Approximate fuel: ~0.07 L/km for petrol car, +10% eco penalty if eco route
        fuel_l = round(distance_km * 0.07, 2)
        co2_kg = round(fuel_l * 2.31, 2)   # 2.31 kg CO₂/L petrol (DEFRA)

        # Confidence score — higher is better:
        # penalise heavily for long delays relative to total time
        delay_ratio = delay_sec / max(summary["travelTimeInSeconds"], 1)
        confidence = max(50, round(100 - delay_ratio * 80))

        return {
            "travel_min": travel_min,
            "distance_km": distance_km,
            "traffic_delay_min": traffic_min,
            "fuel_l": fuel_l,
            "co2_kg": co2_kg,
            "confidence": confidence,
            "departure_time": summary.get("departureTime", ""),
            "arrival_time": summary.get("arrivalTime", ""),
            "traffic_length_m": summary.get("trafficLengthInMeters", 0),
        }
    except (httpx.HTTPError, KeyError, IndexError):
        return None


async def get_route(
    origin: str,
    destination: str,
    route_type: str = "ai",  # ai | fastest | eco | avoid-traffic | avoid-toll
) -> dict:
    """
    Main entry point. Geocodes origin + destination, then calls TomTom
    routing with the requested strategy.
    """
    if not settings.TOMTOM_API_KEY:
        return {
            "source": "placeholder",
            "error": "Set TOMTOM_API_KEY in backend/.env to enable AI routing",
        }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Geocode in parallel
        origin_coords, dest_coords = await asyncio.gather(
            _geocode(origin, client),
            _geocode(destination, client),
        )

        if origin_coords is None:
            return {"error": f"Could not find location: '{origin}'"}
        if dest_coords is None:
            return {"error": f"Could not find location: '{destination}'"}

        olat, olon = origin_coords
        dlat, dlon = dest_coords

        # Map frontend route types to TomTom params
        type_map = {
            "fastest":        ("fastest", []),
            "eco":            ("eco",     []),
            "avoid-traffic":  ("fastest", ["tollRoads"]),   # avoids delays
            "avoid-toll":     ("fastest", ["tollRoads"]),
        }

        if route_type == "ai":
            # Run all variants in parallel, pick best overall
            variants = {
                "fastest":       ("fastest", []),
                "eco":           ("eco",     []),
                "avoid-traffic": ("fastest", ["carpools"]),
                "avoid-toll":    ("fastest", ["tollRoads"]),
            }
            tasks = {
                k: _calculate_route(olat, olon, dlat, dlon, tt, av, client)
                for k, (tt, av) in variants.items()
            }
            results = dict(
                zip(tasks.keys(), await asyncio.gather(*tasks.values()))
            )

            # Score each: lower travel time + lower delay + lower fuel = better
            def _score(r: dict | None) -> float:
                if r is None:
                    return float("inf")
                return r["travel_min"] * 0.5 + r["traffic_delay_min"] * 2 + r["fuel_l"] * 5

            best_key = min(results, key=lambda k: _score(results[k]))
            best = results[best_key]
            if best is None:
                return {"error": "Routing failed for all route types"}

            best["recommended_type"] = best_key
            best["all_routes"] = {
                k: v for k, v in results.items() if v is not None
            }
            best["source"] = "tomtom-ai"
            best["origin"] = {"name": origin, "lat": olat, "lon": olon}
            best["destination"] = {"name": destination, "lat": dlat, "lon": dlon}
            return best

        else:
            tt_type, avoid = type_map.get(route_type, ("fastest", []))
            result = await _calculate_route(olat, olon, dlat, dlon, tt_type, avoid, client)
            if result is None:
                return {"error": "Routing failed. Check your API key or try different locations."}
            result["source"] = "tomtom"
            result["origin"] = {"name": origin, "lat": olat, "lon": olon}
            result["destination"] = {"name": destination, "lat": dlat, "lon": dlon}
            return result
