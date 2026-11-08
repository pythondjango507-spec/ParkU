import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ParkingSpot
from app.schemas import ParkingSpotResponse, ParkingSpotCreate

router = APIRouter(prefix="/api/spots", tags=["Parking Spots"])

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def _adapt_spots_to_user_location(db: Session, user_lat: float, user_lon: float, user_area: Optional[str] = None):
    """
    Anchor demo parking spots dynamically around the user's real live coordinates.
    Only adapts mock/unowned spots (owner_id is None). NEVER modifies real owner-registered spots.
    """
    spots = db.query(ParkingSpot).filter(ParkingSpot.owner_id.is_(None)).all()
    if not spots:
        return

    # Check if spots are far away (> 5km)
    first_spot_dist = haversine_distance(user_lat, user_lon, spots[0].latitude, spots[0].longitude)
    if first_spot_dist > 5.0:
        is_bangalore = (
            (12.7 <= user_lat <= 13.3 and 77.4 <= user_lon <= 77.9) or
            (user_area and any(k in user_area.lower() for k in ["bengaluru", "bangalore", "marathahalli"]))
        )

        if is_bangalore:
            offsets = [
                (0.0021, 0.0015, "Marathahalli Bridge - ORR Lot", "Near Foot Overbridge, Outer Ring Road", 30.00, "standard", True, 35, 14),
                (-0.0028, 0.0032, "Spice Garden Junction Fast EV Hub", "Kundalahalli Gate, Marathahalli", 50.00, "ev_charging", False, 18, 8),
                (0.0016, -0.0024, "Kalamandir Plaza Covered Deck", "Marathahalli Main Road", 40.00, "standard", True, 45, 19),
                (-0.0035, -0.0019, "Munnekolala Multi-Level Ground", "Varthur Road, Near Munnekolala Lake", 25.00, "compact", False, 50, 32),
                (0.0034, -0.0031, "HAL Old Airport Road Express Bay", "Near Marathahalli Underpass", 35.00, "accessible", True, 20, 11),
            ]
        else:
            local_prefix = user_area if user_area else "Local"
            offsets = [
                (0.0022, 0.0018, f"{local_prefix} Central Parking", "Main Transit Road", 30.00, "standard", True, 30, 12),
                (-0.0029, 0.0025, f"{local_prefix} Clean Energy EV Hub", "Commercial Lane 2", 50.00, "ev_charging", False, 15, 6),
                (0.0015, -0.0031, f"{local_prefix} Market Covered Deck", "High Street Plaza", 40.00, "standard", True, 40, 18),
                (-0.0038, -0.0022, f"{local_prefix} Express Open Ground", "Near Bus Terminal", 25.00, "compact", False, 60, 35),
                (0.0031, -0.0015, f"{local_prefix} Priority & Health Bay", "Civic Center Road", 35.00, "accessible", True, 20, 9),
            ]

        for i, s in enumerate(spots[:len(offsets)]):
            dlat, dlon, name, loc, rate, stype, covered, total, avail = offsets[i]
            s.latitude = user_lat + dlat
            s.longitude = user_lon + dlon
            s.name = name
            s.location = loc
            s.hourly_rate = rate
            s.spot_type = stype
            s.is_covered = covered
            s.total_slots = total
            s.available_slots = avail
        db.commit()

@router.get("/", response_model=List[ParkingSpotResponse])
def get_parking_spots(
    query: Optional[str] = Query(None, description="Search by name or location"),
    spot_type: Optional[str] = Query(None, description="Filter by spot type"),
    is_covered: Optional[bool] = Query(None, description="Filter by covered roof"),
    user_lat: Optional[float] = Query(None, description="User's live latitude"),
    user_lon: Optional[float] = Query(None, description="User's live longitude"),
    user_area: Optional[str] = Query(None, description="User's live locality name"),
    db: Session = Depends(get_db)
):
    # If user provided their live GPS coordinates, adapt spots to their vicinity
    if isinstance(user_lat, (int, float)) and isinstance(user_lon, (int, float)):
        _adapt_spots_to_user_location(db, user_lat, user_lon, user_area if isinstance(user_area, str) else None)

    q = db.query(ParkingSpot)
    if query and isinstance(query, str):
        search_pattern = f"%{query}%"
        q = q.filter(
            (ParkingSpot.name.ilike(search_pattern)) | 
            (ParkingSpot.location.ilike(search_pattern))
        )
    if spot_type and isinstance(spot_type, str):
        q = q.filter(ParkingSpot.spot_type == spot_type)
    if is_covered is not None and isinstance(is_covered, bool):
        q = q.filter(ParkingSpot.is_covered == is_covered)

    raw_spots = q.all()

    # Calculate live distance
    has_user_coords = isinstance(user_lat, (int, float)) and isinstance(user_lon, (int, float))
    spot_list = []
    for s in raw_spots:
        resp = ParkingSpotResponse.model_validate(s)
        if has_user_coords:
            resp.distance_km = haversine_distance(user_lat, user_lon, s.latitude, s.longitude)
        spot_list.append(resp)

    # Sort by closest distance if location is available
    if has_user_coords:
        spot_list.sort(key=lambda x: x.distance_km if x.distance_km is not None else 99999)

    return spot_list


@router.get("/{spot_id}", response_model=ParkingSpotResponse)
def get_parking_spot(spot_id: int, db: Session = Depends(get_db)):
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return spot


@router.post("/", response_model=ParkingSpotResponse, status_code=201)
def create_parking_spot(spot_in: ParkingSpotCreate, db: Session = Depends(get_db)):
    spot = ParkingSpot(**spot_in.model_dump())
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


@router.post("/seed", status_code=200)
def seed_default_spots(db: Session = Depends(get_db)):
    """Seed initial sample parking spots if table is empty."""
    existing_count = db.query(ParkingSpot).count()
    if existing_count > 0:
        return {"message": f"Database already contains {existing_count} spots."}

    initial_spots = [
        ParkingSpot(
            name="Central Metro Parking",
            location="Metro Station Lane 1",
            latitude=37.7833,
            longitude=-122.4167,
            hourly_rate=2.00,
            total_slots=30,
            available_slots=14,
            spot_type="standard",
            is_covered=True,
            description="Secure multi-level parking directly adjacent to the transit station."
        ),
        ParkingSpot(
            name="GreenEnergy Fast EV Hub",
            location="Greenway Road, Hub 4",
            latitude=37.7785,
            longitude=-122.4190,
            hourly_rate=4.00,
            total_slots=15,
            available_slots=6,
            spot_type="ev_charging",
            is_covered=False,
            description="Dedicated charging spots with Level 2 and DC Fast charging stations."
        ),
        ParkingSpot(
            name="City Market Plaza Deck",
            location="Market High Street",
            latitude=37.7690,
            longitude=-122.4250,
            hourly_rate=3.50,
            total_slots=45,
            available_slots=22,
            spot_type="standard",
            is_covered=True,
            description="Covered garage with CCTV surveillance, 1 minute to shopping district."
        ),
        ParkingSpot(
            name="Express Open Ground",
            location="Near Bus Terminal",
            latitude=37.7910,
            longitude=-122.4050,
            hourly_rate=1.50,
            total_slots=60,
            available_slots=38,
            spot_type="compact",
            is_covered=False,
            description="Economical open lot for quick access and short or long stay."
        ),
        ParkingSpot(
            name="Healthcare & Priority Bay",
            location="Hospital Avenue",
            latitude=37.7630,
            longitude=-122.4580,
            hourly_rate=2.50,
            total_slots=20,
            available_slots=10,
            spot_type="accessible",
            is_covered=True,
            description="Spacious priority spots with level ramp access to medical and public offices."
        )
    ]
    db.add_all(initial_spots)
    db.commit()
    return {"message": "Successfully seeded initial parking spots", "count": len(initial_spots)}
