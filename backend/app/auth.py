import json
import time
import base64
import hmac
import hashlib
import secrets
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.config import SECRET_KEY, JWT_EXPIRATION_DAYS

security = HTTPBearer(auto_error=False)

# ==============================================================================
# 1. Cryptographically Secure Password Hashing (PBKDF2-HMAC-SHA256 with Salting)
# ==============================================================================

def hash_password(password: str) -> str:
    """
    Hashes password using PBKDF2-HMAC-SHA256 with 200,000 iterations and a
    cryptographically random 16-byte salt (meeting OWASP security guidelines).
    """
    salt = secrets.token_bytes(16)
    # 200,000 iterations for robust protection against GPU brute force
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000)
    # Store with 'v2$' prefix to distinguish from legacy 100k iteration hashes
    storage = b"v2$" + salt + key
    return base64.b64encode(storage).decode("ascii")


def verify_password(plain_password: str, hashed_storage: str) -> bool:
    """
    Verifies a plain password against stored salt + hash in constant time
    (timing attack resistant). Supports both v2 (200k) and v1 (100k) hashes.
    """
    try:
        raw = base64.b64decode(hashed_storage.encode("ascii"))
        if raw.startswith(b"v2$"):
            # V2 format: 200,000 iterations
            salt = raw[3:19]
            expected_key = raw[19:]
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 200000)
            return secrets.compare_digest(key, expected_key)
        else:
            # V1 legacy format: 100,000 iterations
            salt = raw[:16]
            expected_key = raw[16:]
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
            return secrets.compare_digest(key, expected_key)
    except Exception:
        return False


# ==============================================================================
# 2. RFC 7519 Compliant Stateless JWT (JSON Web Tokens)
# ==============================================================================

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

def _base64url_decode(data_str: str) -> bytes:
    padding = "=" * ((4 - len(data_str) % 4) % 4)
    return base64.urlsafe_b64decode((data_str + padding).encode("ascii"))

def create_user_token(user: User) -> str:
    """
    Generates a signed, stateless JWT token that survives server restarts,
    scales across worker processes, and expires automatically.
    """
    now = int(time.time())
    exp = now + (JWT_EXPIRATION_DAYS * 86400)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "iat": now,
        "exp": exp,
    }

    header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_user_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies JWT signature and expiration in constant time.
    Returns payload dictionary if valid, None if invalid or expired.
    """
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _base64url_decode(sig_b64)

        if not secrets.compare_digest(expected_sig, provided_sig):
            return None

        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
        # Check token expiration
        if payload.get("exp", 0) < int(time.time()):
            return None

        return payload
    except Exception:
        return None


# ==============================================================================
# 3. Rate Limiter (Brute-Force & OTP Flood Protection)
# ==============================================================================

class RateLimiter:
    """
    In-memory sliding-window rate limiter protecting login, registration,
    and password reset against brute force and credential stuffing attacks.
    """
    def __init__(self):
        # key -> [timestamps of failed attempts]
        self._login_failures: Dict[str, list] = {}
        # key -> last timestamp OTP was sent
        self._otp_last_sent: Dict[str, float] = {}
        # key -> attempt count for current OTP
        self._otp_attempts: Dict[str, int] = {}

    def check_login_rate_limit(self, identifier: str, max_attempts: int = 5, window_sec: int = 300):
        now = time.time()
        failures = [t for t in self._login_failures.get(identifier, []) if now - t < window_sec]
        self._login_failures[identifier] = failures
        if len(failures) >= max_attempts:
            cooldown_left = int(window_sec - (now - failures[0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please wait {cooldown_left} seconds before trying again."
            )

    def record_login_failure(self, identifier: str):
        now = time.time()
        if identifier not in self._login_failures:
            self._login_failures[identifier] = []
        self._login_failures[identifier].append(now)

    def clear_login_failures(self, identifier: str):
        self._login_failures.pop(identifier, None)

    def check_otp_request_rate_limit(self, email: str, cooldown_sec: int = 60):
        now = time.time()
        last_sent = self._otp_last_sent.get(email, 0.0)
        if now - last_sent < cooldown_sec:
            remaining = int(cooldown_sec - (now - last_sent))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another verification code."
            )
        self._otp_last_sent[email] = now
        self._otp_attempts[email] = 0

    def record_otp_verify_attempt(self, email: str, max_attempts: int = 5):
        attempts = self._otp_attempts.get(email, 0) + 1
        self._otp_attempts[email] = attempts
        if attempts > max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. Please request a new verification code."
            )
        return attempts

rate_limiter = RateLimiter()


# ==============================================================================
# 4. FastAPI Dependencies for Authentication & RBAC
# ==============================================================================

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Dependency to retrieve the authenticated user from the Bearer JWT token."""
    if not auth:
        return None
    token = auth.credentials
    payload = decode_user_token(token)
    if not payload:
        return None
    user_id = int(payload.get("sub", 0))
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return user


def require_current_user(
    user: Optional[User] = Depends(get_current_user)
) -> User:
    """Strict dependency requiring an active, valid Bearer JWT token."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired or invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_owner(
    user: User = Depends(require_current_user)
) -> User:
    """Strict dependency requiring Parking Place Owner admin privileges."""
    if user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Parking Place Owner admin privileges required to access this resource."
        )
    return user
