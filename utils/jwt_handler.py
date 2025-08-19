from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt, JWTError
import uuid

# ====== CONFIG ======
SECRET_KEY = "bbefe2530098846cfb97be63763ea80605f2c0349d384d9fe2ad72fff7eed2c3"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30         # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7            # 7 days
GUEST_TOKEN_EXPIRE_MINUTES = 60          # 60 minutes
# ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate an ACCESS token (JWT). Always tags as 'user'.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "type": "user"  # important: distinguish from guest
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """
    Generate a REFRESH token (JWT). Always tags as 'user'.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "user"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Union[dict, None]:
    """
    Decode JWT and return the payload or None if invalid/expired.
    jose raises on expired tokens by default if 'exp' present.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

def create_guest_token() -> str:
    """
    Create a guest token: no DB lookup required for auth.
    """
    guest_id = str(uuid.uuid4())
    expire = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": guest_id,
        "type": "guest",
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
