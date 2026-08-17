from fastapi import APIRouter, Query

from app.services.weather_service import get_forecast, get_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("")
async def read_weather(lat: float | None = Query(None), lon: float | None = Query(None)):
    return await get_weather(lat, lon)


@router.get("/forecast")
async def read_forecast(lat: float | None = Query(None), lon: float | None = Query(None)):
    return await get_forecast(lat, lon)
