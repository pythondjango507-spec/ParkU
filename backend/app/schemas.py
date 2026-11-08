import re
import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[\w\-]+(\.[\w\-]+)+$")
COMMON_WEAK_PASSWORDS = {
    "password", "12345678", "123456789", "qwertyui", "admin123", "password123", "parku123", "letmein1"
}

def validate_strong_password(v: str) -> str:
    """Enforce OWASP strong password policy: >=8 chars, letters + digits/symbols, not common."""
    v = v.strip()
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if v.lower() in COMMON_WEAK_PASSWORDS:
        raise ValueError("This password is too common and easily guessed. Please choose a stronger password.")
    has_letter = any(c.isalpha() for c in v)
    has_digit_or_symbol = any(not c.isalpha() for c in v)
    if not (has_letter and has_digit_or_symbol):
        raise ValueError("Password must include both letters and numbers/symbols.")
    return v

def validate_clean_email(v: str) -> str:
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Please provide a valid email address.")
    return cleaned

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "driver"  # "driver" or "owner"
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_clean_email(v)

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_strong_password(v)

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def check_login_email(cls, v: str) -> str:
        return v.strip().lower()

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_forgot_email(cls, v: str) -> str:
        return validate_clean_email(v)

class ForgotPasswordResponse(BaseModel):
    success: bool = True
    message: str
    reset_code: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

    @field_validator("email")
    @classmethod
    def check_reset_email(cls, v: str) -> str:
        return validate_clean_email(v)

    @field_validator("new_password")
    @classmethod
    def check_reset_password(cls, v: str) -> str:
        return validate_strong_password(v)

class ResetPasswordResponse(BaseModel):
    success: bool
    message: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_change_password(cls, v: str) -> str:
        return validate_strong_password(v)


# --- Parking Spot Schemas ---
class ParkingSpotBase(BaseModel):
    name: str
    location: str
    latitude: float = 12.9591
    longitude: float = 77.6974
    hourly_rate: float = 30.00
    daily_rate: float = 200.00
    weekly_discount_percent: float = 15.00  # Default 15% concession if >= 7 days
    total_slots: int = 10
    available_slots: int = 10
    spot_type: str = "standard"
    is_covered: bool = False
    description: Optional[str] = None

class ParkingSpotCreate(ParkingSpotBase):
    pass

class ParkingSpotResponse(ParkingSpotBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime.datetime
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

class SpotPricingUpdate(BaseModel):
    hourly_rate: Optional[float] = None
    daily_rate: Optional[float] = None
    weekly_discount_percent: Optional[float] = None
    total_slots: Optional[int] = None
    is_covered: Optional[bool] = None


# --- Booking Schemas ---
class BookingCreate(BaseModel):
    spot_id: int
    user_name: str
    user_email: Optional[str] = "driver@parku.local"
    vehicle_plate: str
    booking_type: str = "hourly"  # "hourly" or "daily"
    
    # Hourly options
    duration_hours: Optional[int] = 1
    booking_date: Optional[str] = None
    start_time: Optional[str] = "Now"
    end_time: Optional[str] = None

    # Multi-day options
    from_date: Optional[str] = None
    to_date: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    spot_id: int
    user_id: Optional[int] = None
    user_name: str
    user_email: Optional[str]
    vehicle_plate: str

    booking_type: str = "hourly"
    booking_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    from_date: Optional[str] = None
    to_date: Optional[str] = None
    total_days: int = 0
    duration_hours: int = 1

    original_price: float = 0.0
    discount_applied: float = 0.0
    discount_percent: float = 0.0
    total_price: float
    status: str
    created_at: datetime.datetime
    spot: Optional[ParkingSpotResponse] = None

    class Config:
        from_attributes = True


# --- AI Gemini Schemas ---
class AIRecommendationRequest(BaseModel):
    destination: Optional[str] = None
    vehicle_type: Optional[str] = "car"  # car, ev, motorcycle, van
    max_budget: Optional[float] = None
    needs_ev: Optional[bool] = False
    needs_covered: Optional[bool] = False
    duration_hours: Optional[int] = 1
    user_preferences: Optional[str] = None
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None
    user_area: Optional[str] = None

class RecommendedSpot(BaseModel):
    spot_id: int
    name: str
    reason: str
    estimated_cost: float
    score: int = Field(ge=1, le=100)

class AIRecommendationResponse(BaseModel):
    recommendations: List[RecommendedSpot]
    summary_advice: str

class AIChatRequest(BaseModel):
    message: str

class AIChatResponse(BaseModel):
    reply: str
