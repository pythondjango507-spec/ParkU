import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Initialize client if key is present
client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize Gemini Client with provided key: {e}")


def get_ai_parking_recommendations(
    spots_data: List[Dict[str, Any]],
    user_criteria: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Uses Gemini API to evaluate available parking spots and recommend the best options
    based on the user's destination, budget, vehicle type, and preferences.
    """
    if not client or not GEMINI_API_KEY:
        # Graceful fallback when API key is not configured yet
        return _fallback_recommendations(spots_data, user_criteria)

    prompt = f"""
You are ParkU's intelligent AI Parking Assistant. Analyze the available parking spots and recommend the top matches for the driver based on their criteria.

Driver Criteria:
- Destination / Query: {user_criteria.get('destination', 'General area')}
- Vehicle Type: {user_criteria.get('vehicle_type', 'car')}
- Max Budget: {user_criteria.get('max_budget', 'Flexible')}
- Needs EV Charging: {user_criteria.get('needs_ev', False)}
- Needs Covered Parking: {user_criteria.get('needs_covered', False)}
- Duration: {user_criteria.get('duration_hours', 1)} hours
- Additional Notes: {user_criteria.get('user_preferences', 'None')}

Available Parking Spots (JSON):
{json.dumps(spots_data, indent=2)}

Respond with a strictly formatted JSON object matching this schema:
{{
  "recommendations": [
    {{
      "spot_id": <int>,
      "name": "<string>",
      "reason": "<one sentence explaining why this spot fits their needs>",
      "estimated_cost": <float>,
      "score": <int between 1 and 100>
    }}
  ],
  "summary_advice": "<short conversational paragraph offering practical tips, such as walking time or peak hours>"
}}
Only output valid JSON, no markdown formatting or extra text.
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return _fallback_recommendations(spots_data, user_criteria)


def chat_with_parking_ai(user_message: str, spots_data: List[Dict[str, Any]]) -> str:
    """Chat with the ParkU Gemini AI Assistant."""
    if not client or not GEMINI_API_KEY:
        return (
            "Hello! I am your ParkU AI Parking Assistant. "
            "Please configure your `GEMINI_API_KEY` in `backend/.env` to unlock live AI assistance. "
            "Meanwhile, you can browse all parking spots and make instant reservations!"
        )

    system_instruction = (
        "You are ParkU AI, an assistant for smart parking reservation and campus/city mobility. "
        "Help drivers find spots, understand rates, check EV charging availability, and navigate parking rules. "
        f"Here are the active parking lots: {json.dumps(spots_data)}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error calling Gemini chat: {e}")
        return f"I'm temporarily having trouble connecting to AI services: {str(e)}"


def _fallback_recommendations(spots: List[Dict[str, Any]], criteria: Dict[str, Any]) -> Dict[str, Any]:
    """Algorithmic heuristic fallback when Gemini API key is not configured."""
    duration = criteria.get("duration_hours", 1) or 1
    needs_ev = criteria.get("needs_ev", False)
    needs_covered = criteria.get("needs_covered", False)

    ranked = []
    for s in spots:
        score = 80
        reasons = []
        if s.get("available_slots", 0) > 0:
            score += 10
        if needs_ev and s.get("spot_type") == "ev_charging":
            score += 15
            reasons.append("Equipped with dedicated EV charging stations")
        if needs_covered and s.get("is_covered"):
            score += 10
            reasons.append("Covered garage protection from weather")

        cost = round(s.get("hourly_rate", 2.5) * duration, 2)
        if criteria.get("max_budget") and cost <= criteria["max_budget"]:
            score += 5
            reasons.append(f"Fits within your ${criteria['max_budget']} budget")

        if not reasons:
            reasons.append(f"Convenient spot located at {s.get('location')}")

        ranked.append({
            "spot_id": s["id"],
            "name": s["name"],
            "reason": ". ".join(reasons),
            "estimated_cost": cost,
            "score": min(score, 99)
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return {
        "recommendations": ranked[:3],
        "summary_advice": (
            "These spots were selected based on availability and price. "
            "Tip: Add your `GEMINI_API_KEY` in backend/.env for deep contextual AI recommendations!"
        )
    }

