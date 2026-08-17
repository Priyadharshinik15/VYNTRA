from fastapi import APIRouter

from app.services.traffic_service import get_traffic

router = APIRouter(prefix="/api/traffic", tags=["traffic"])


@router.get("")
async def read_traffic():
    return await get_traffic()
