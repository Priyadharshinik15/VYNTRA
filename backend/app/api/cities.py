from fastapi import APIRouter

from app.services.city_service import get_city_comparison

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("")
async def read_cities():
    return await get_city_comparison()
