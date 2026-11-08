import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ParkingSpot, Booking, User
from app.schemas import BookingCreate, BookingResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

def _calculate_days_between(from_date_str: str, to_date_str: str) -> int:
    """Calculate the number of days between two dates. Returns at least 1."""
    formats = ["%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"]
    d1 = None
    d2 = None
    for fmt in formats:
        try:
            d1 = datetime.datetime.strptime(from_date_str, fmt).date()
            break
        except ValueError:
            pass
    for fmt in formats:
        try:
            d2 = datetime.datetime.strptime(to_date_str, fmt).date()
            break
        except ValueError:
            pass

    if d1 and d2:
        diff = (d2 - d1).days
        return max(1, diff + 1)  # Inclusive of start & end day
    return 1

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking_in.spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")

    if spot.available_slots <= 0:
        raise HTTPException(status_code=400, detail="This parking spot is currently full")

    # Handle Hourly vs Multi-Day Booking
    is_daily = (booking_in.booking_type == "daily") and (booking_in.from_date and booking_in.to_date)

    if is_daily:
        total_days = _calculate_days_between(booking_in.from_date, booking_in.to_date)
        daily_rate = spot.daily_rate or (spot.hourly_rate * 8)
        original_price = round(total_days * daily_rate, 2)

        # Apply Long-Term Weekly Concession / Discount if >= 7 days
        if total_days >= 7:
            discount_percent = spot.weekly_discount_percent or 15.0
            discount_applied = round(original_price * (discount_percent / 100.0), 2)
            total_price = round(original_price - discount_applied, 2)
        else:
            discount_percent = 0.0
            discount_applied = 0.0
            total_price = original_price

        duration_hours = total_days * 24
        booking_date = booking_in.from_date
        start_time = "Day Pass"
        end_time = booking_in.to_date
    else:
        # Standard hourly booking
        total_days = 0
        duration_hours = max(1, booking_in.duration_hours or 1)
        original_price = round(spot.hourly_rate * duration_hours, 2)
        discount_applied = 0.0
        discount_percent = 0.0
        total_price = original_price

        booking_date = booking_in.booking_date or datetime.date.today().strftime("%d %b %Y")
        start_time = booking_in.start_time or "Now"
        end_time = booking_in.end_time or f"+{duration_hours} hrs"

    # Decrement available slots
    spot.available_slots -= 1

    booking = Booking(
        spot_id=booking_in.spot_id,
        user_id=current_user.id if current_user else None,
        user_name=booking_in.user_name.strip(),
        user_email=booking_in.user_email or (current_user.email if current_user else None),
        vehicle_plate=booking_in.vehicle_plate.upper().strip(),

        booking_type="daily" if is_daily else "hourly",
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        from_date=booking_in.from_date if is_daily else None,
        to_date=booking_in.to_date if is_daily else None,
        total_days=total_days,

        duration_hours=duration_hours,
        original_price=original_price,
        discount_applied=discount_applied,
        discount_percent=discount_percent,
        total_price=total_price,
        status="confirmed"
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/", response_model=List[BookingResponse])
def get_user_bookings(
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Booking)
    if current_user and current_user.role != "owner":
        # Return bookings made by this logged in driver
        q = q.filter(
            (Booking.user_id == current_user.id) |
            (Booking.user_email == current_user.email)
        )
    return q.order_by(Booking.created_at.desc()).all()


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = "cancelled"
    # Restore slot
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
    if spot:
        spot.available_slots = min(spot.total_slots, spot.available_slots + 1)

    db.commit()
    db.refresh(booking)
    return booking
