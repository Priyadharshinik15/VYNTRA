from fastapi import APIRouter

from app.services.analytics_service import get_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
async def read_analytics():
    return await get_analytics()
