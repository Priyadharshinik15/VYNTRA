# SmartTrafficOps backend (vertical slice: Live Map + Weather)

## Setup
```
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # then fill in OPENWEATHER_API_KEY and TOMTOM_API_KEY
uvicorn app.main:app --reload --port 8000
```

## Endpoints
- `GET /api/health`
- `GET /api/weather?lat=..&lon=..` — real OpenWeather data, cached 5 min
- `GET /api/traffic` — real TomTom traffic flow for the roads in `TRACKED_ROAD_POINTS` (config.py), cached 60s, includes a rule-based congestion score
- `WS /ws/live` — pushes the cached weather+traffic snapshot every 5s

## Swapping in a real ML model later
`app/services/traffic_service.py` has a `_congestion_score()` function.
Replace its body with a call to your trained XGBoost model (load it once at
module import time with joblib, then call `.predict()` here) and keep the
return shape `{"score": int, "level": str, "speed_ratio": float}` — nothing
else in the API or frontend needs to change.
