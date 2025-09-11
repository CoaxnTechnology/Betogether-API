# utils/jwt_handler.py
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt, JWTError
import uuid
import os

# ====== CONFIG ======
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "bbefe2530098846cfb97be63763ea80605f2c0349d384d9fe2ad72fff7eed2c3",  # fallback
)
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30        # user access token
REFRESH_TOKEN_EXPIRE_DAYS = 7           # user refresh token
GUEST_TOKEN_EXPIRE_MINUTES = 60         # guest token
ADMIN_TOKEN_EXPIRE_MINUTES = 30         # admin token
# ====================


# -------- USER TOKENS --------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    User Access Token (short-lived).
    Example: {"sub": "user@example.com", "id": 123}
    """
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "user_access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    User Refresh Token (long-lived).
    Example: {"sub": "user@example.com", "id": 123}
    """
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "user_refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# -------- GUEST TOKEN --------
def create_guest_token(expires_delta: Optional[timedelta] = None) -> str:
    """
    Guest Token (temporary, UUID-based).
    """
    guest_id = str(uuid.uuid4())
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": guest_id, "type": "guest", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# -------- ADMIN TOKEN --------
def create_admin_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Admin Token (short-lived).
    Example: {"sub": "admin@betogether.com", "id": 1, "role": "superadmin"}
    """
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ADMIN_TOKEN_EXPIRE_MINUTES))
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "admin"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# -------- DECODING --------
def decode_token(token: str, expected_type: Optional[str] = None) -> Union[dict, None]:
    """
    Decode JWT and enforce token type if provided.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if expected_type and payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None
