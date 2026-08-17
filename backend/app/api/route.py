from fastapi import APIRouter, Query

from app.services.route_service import get_route

router = APIRouter(prefix="/api/route", tags=["route"])


@router.get("")
async def calculate_route(
    origin: str = Query(..., description="Start location name or 'current location'"),
    destination: str = Query(..., description="Destination name or address"),
    route_type: str = Query("ai", description="ai | fastest | eco | avoid-traffic | avoid-toll"),
):
    """
    Geocode origin + destination then return TomTom routing result enriched
    with an AI recommendation score.
    """
    return await get_route(origin, destination, route_type)
