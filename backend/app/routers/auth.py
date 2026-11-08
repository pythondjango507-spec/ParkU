import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PasswordResetCode
from app.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ChangePasswordRequest,
)
from app.auth import (
    hash_password,
    verify_password,
    create_user_token,
    require_current_user,
    rate_limiter,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.lower().strip()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Securely hash the password with salted PBKDF2 (200k iterations)
    pwd_hash = hash_password(user_in.password)

    new_user = User(
        name=user_in.name.strip(),
        email=clean_email,
        password_hash=pwd_hash,
        role=user_in.role if user_in.role in ["driver", "owner"] else "driver",
        phone=user_in.phone.strip() if user_in.phone else None,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_user_token(new_user)
    return AuthResponse(user=UserResponse.model_validate(new_user), token=token)


@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    clean_email = credentials.email.lower().strip()

    # Rate limiting: Protect against brute-force attacks
    rate_limiter.check_login_rate_limit(clean_email)

    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        rate_limiter.record_login_failure(clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Login successful: clear any recorded failure attempts
    rate_limiter.clear_login_failures(clean_email)

    token = create_user_token(user)
    return AuthResponse(user=UserResponse.model_validate(user), token=token)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(require_current_user)):
    return user


@router.post("/change-password", response_model=ResetPasswordResponse)
def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    """Authenticated user changes their password securely."""
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current password was entered incorrectly."
        )

    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your new password cannot be the same as your current password."
        )

    user.password_hash = hash_password(req.new_password)
    db.commit()

    return ResetPasswordResponse(
        success=True,
        message="Your password has been changed successfully."
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a secure 6-digit OTP verification code to reset password."""
    clean_email = req.email.lower().strip()

    # Rate limiting: 60-second cooldown between OTP requests
    rate_limiter.check_otp_request_rate_limit(clean_email)

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please check your spelling or register."
        )

    # Invalidate any prior pending reset codes for this email
    db.query(PasswordResetCode).filter(PasswordResetCode.email == clean_email).delete()

    # Generate cryptographically secure 6-digit code
    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

    reset_entry = PasswordResetCode(
        email=clean_email,
        code=code,
        expires_at=expires_at
    )
    db.add(reset_entry)
    db.commit()

    return ForgotPasswordResponse(
        success=True,
        message=f"A 6-digit verification code has been issued for {clean_email}.",
        reset_code=code
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validate verification code and securely update password."""
    clean_email = req.email.lower().strip()
    clean_code = req.code.strip()

    # Rate limiting: Max 5 attempts per OTP code
    rate_limiter.record_otp_verify_attempt(clean_email)

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # Verify code exists
    record = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == clean_email,
        PasswordResetCode.code == clean_code
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code. Please check and try again."
        )

    # Check expiration
    if record.expires_at < datetime.datetime.utcnow():
        db.delete(record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired (valid for 15 minutes). Please request a new code."
        )

    # Update password with salted PBKDF2 hash (200k iterations)
    user.password_hash = hash_password(req.new_password)
    # Remove the consumed reset token
    db.delete(record)
    db.commit()

    return ResetPasswordResponse(
        success=True,
        message="Password has been reset successfully. You can now log in with your new password."
    )

    # Update password with salted PBKDF2 hash
    user.password_hash = hash_password(req.new_password)
    # Remove the consumed reset token
    db.delete(record)
    db.commit()

    return ResetPasswordResponse(
        success=True,
        message="Password has been reset successfully. You can now log in with your new password."
    )

