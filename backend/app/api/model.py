from fastapi import APIRouter

from app.services.model_service import get_model_metrics

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("")
async def read_model():
    return await get_model_metrics()
