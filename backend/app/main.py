from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, alerts, cities, model, prediction, route, traffic, weather
from app.core.config import settings
from app.websocket import live

app = FastAPI(title="SmartTrafficOps API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(weather.router)
app.include_router(traffic.router)
app.include_router(alerts.router)
app.include_router(prediction.router)
app.include_router(route.router)
app.include_router(analytics.router)
app.include_router(cities.router)
app.include_router(model.router)
app.include_router(live.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
