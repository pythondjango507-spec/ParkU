import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="driver")  # "driver" or "owner"
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    parking_spots = relationship("ParkingSpot", back_populates="owner")
    bookings = relationship("Booking", back_populates="user")


class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False, default=12.9591)
    longitude = Column(Float, nullable=False, default=77.6974)
    hourly_rate = Column(Float, nullable=False, default=30.00)
    daily_rate = Column(Float, nullable=False, default=200.00)
    weekly_discount_percent = Column(Float, nullable=False, default=15.00)  # Discount % for >= 7 days
    total_slots = Column(Integer, nullable=False, default=10)
    available_slots = Column(Integer, nullable=False, default=10)
    spot_type = Column(String(50), default="standard")  # standard, ev_charging, compact, accessible
    is_covered = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="parking_spots")
    bookings = relationship("Booking", back_populates="spot", cascade="all, delete-orphan")


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(100), nullable=False)
    user_email = Column(String(100), nullable=True)
    vehicle_plate = Column(String(50), nullable=False)

    booking_type = Column(String(20), default="hourly")  # "hourly" or "daily"
    booking_date = Column(String(50), nullable=True)     # For hourly or single day
    start_time = Column(String(50), nullable=True)       # For hourly
    end_time = Column(String(50), nullable=True)

    from_date = Column(String(50), nullable=True)        # For daily/multi-day
    to_date = Column(String(50), nullable=True)          # For daily/multi-day
    total_days = Column(Integer, default=0)

    duration_hours = Column(Integer, default=1)
    original_price = Column(Float, default=0.0)
    discount_applied = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)
    total_price = Column(Float, nullable=False)

    status = Column(String(20), default="confirmed")     # confirmed, cancelled, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    spot = relationship("ParkingSpot", back_populates="bookings")
    user = relationship("User", back_populates="bookings")
