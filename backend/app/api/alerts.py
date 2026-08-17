from fastapi import APIRouter

from app.services.alerts_service import get_alerts

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def read_alerts():
    return await get_alerts()
