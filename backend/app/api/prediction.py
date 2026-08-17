from fastapi import APIRouter

from app.services.prediction_service import get_prediction

router = APIRouter(prefix="/api/prediction", tags=["prediction"])


@router.get("")
async def read_prediction():
    return await get_prediction()
