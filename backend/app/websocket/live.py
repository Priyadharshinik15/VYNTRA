"""
Pushes the latest cached weather + traffic snapshot to every connected
browser every BROADCAST_INTERVAL_SECONDS. It reads from the same in-memory
caches the REST endpoints use, so it never makes extra calls to
OpenWeather/TomTom beyond what those services already do on their own
refresh schedule.
"""
import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.alerts_service import get_alerts
from app.services.prediction_service import get_prediction
from app.services.traffic_service import get_traffic
from app.services.weather_service import get_weather

router = APIRouter()

_active_connections: set[WebSocket] = set()


@router.websocket("/ws/live")
async def live_updates(websocket: WebSocket):
    await websocket.accept()
    _active_connections.add(websocket)
    try:
        while True:
            weather = await get_weather()
            traffic = await get_traffic()
            alerts = await get_alerts()
            prediction = await get_prediction()
            payload = {
                "type": "live_update",
                "weather": weather,
                "traffic": traffic,
                "alerts": alerts,
                "prediction": prediction,
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(settings.BROADCAST_INTERVAL_SECONDS)
    except WebSocketDisconnect:
        _active_connections.discard(websocket)
