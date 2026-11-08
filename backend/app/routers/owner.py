from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ParkingSpot, Booking, User
from app.schemas import (
    ParkingSpotResponse,
    ParkingSpotCreate,
    SpotPricingUpdate,
    BookingResponse
)
from app.auth import require_owner

router = APIRouter(prefix="/api/owner", tags=["Parking Place Owner Admin"])

@router.get("/spots", response_model=List[ParkingSpotResponse])
def get_owner_parking_spots(
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """Retrieve all parking facilities managed by the authenticated owner."""
    spots = db.query(ParkingSpot).filter(ParkingSpot.owner_id == owner.id).all()
    return spots


@router.put("/spots/{spot_id}/pricing", response_model=ParkingSpotResponse)
def update_spot_pricing(
    spot_id: int,
    update_data: SpotPricingUpdate,
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """Owner updates hourly rate, daily rate, and weekly discount concession percentage."""
    spot = db.query(ParkingSpot).filter(
        ParkingSpot.id == spot_id,
        ParkingSpot.owner_id == owner.id
    ).first()

    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking spot not found or not owned by you."
        )

    if update_data.hourly_rate is not None:
        spot.hourly_rate = round(update_data.hourly_rate, 2)
    if update_data.daily_rate is not None:
        spot.daily_rate = round(update_data.daily_rate, 2)
    if update_data.weekly_discount_percent is not None:
        # e.g. 15% discount
        spot.weekly_discount_percent = max(0.0, min(100.0, round(update_data.weekly_discount_percent, 1)))
    if update_data.total_slots is not None:
        slot_diff = update_data.total_slots - spot.total_slots
        spot.total_slots = update_data.total_slots
        spot.available_slots = max(0, spot.available_slots + slot_diff)
    if update_data.is_covered is not None:
        spot.is_covered = update_data.is_covered

    db.commit()
    db.refresh(spot)
    return spot


@router.get("/bookings", response_model=List[BookingResponse])
def get_owner_bookings(
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """Retrieve all customer bookings for the owner's parking spots."""
    owner_spot_ids = [s.id for s in db.query(ParkingSpot).filter(ParkingSpot.owner_id == owner.id).all()]
    if not owner_spot_ids:
        return []

    bookings = db.query(Booking).filter(
        Booking.spot_id.in_(owner_spot_ids)
    ).order_by(Booking.created_at.desc()).all()
    return bookings


@router.post("/spots", response_model=ParkingSpotResponse, status_code=status.HTTP_201_CREATED)
def create_owner_spot(
    spot_in: ParkingSpotCreate,
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """Owner registers a new parking facility."""
    data = spot_in.model_dump()
    data["owner_id"] = owner.id
    spot = ParkingSpot(**data)
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot
