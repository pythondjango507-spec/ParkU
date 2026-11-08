from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ParkingSpot
from app.schemas import (
    AIRecommendationRequest,
    AIRecommendationResponse,
    AIChatRequest,
    AIChatResponse
)
from app.gemini_service import get_ai_parking_recommendations, chat_with_parking_ai

from app.routers.spots import _adapt_spots_to_user_location, haversine_distance

router = APIRouter(prefix="/api/ai", tags=["AI Gemini Assistant"])

def _spots_to_dict_list(spots, user_lat=None, user_lon=None):
    results = []
    for s in spots:
        item = {
            "id": s.id,
            "name": s.name,
            "location": s.location,
            "hourly_rate": s.hourly_rate,
            "available_slots": s.available_slots,
            "total_slots": s.total_slots,
            "spot_type": s.spot_type,
            "is_covered": s.is_covered,
            "description": s.description
        }
        if user_lat is not None and user_lon is not None:
            item["distance_km"] = haversine_distance(user_lat, user_lon, s.latitude, s.longitude)
        results.append(item)
    return results

@router.post("/recommend", response_model=AIRecommendationResponse)
def recommend_parking(
    criteria: AIRecommendationRequest,
    db: Session = Depends(get_db)
):
    if criteria.user_lat is not None and criteria.user_lon is not None:
        _adapt_spots_to_user_location(db, criteria.user_lat, criteria.user_lon, criteria.user_area)

    spots = db.query(ParkingSpot).all()
    spots_data = _spots_to_dict_list(spots, criteria.user_lat, criteria.user_lon)
    result = get_ai_parking_recommendations(spots_data, criteria.model_dump())
    return result


@router.post("/chat", response_model=AIChatResponse)
def chat_ai(
    chat_in: AIChatRequest,
    db: Session = Depends(get_db)
):
    spots = db.query(ParkingSpot).all()
    spots_data = _spots_to_dict_list(spots)
    reply_text = chat_with_parking_ai(chat_in.message, spots_data)
    return AIChatResponse(reply=reply_text)

