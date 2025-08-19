from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from utils.jwt_handler import SECRET_KEY, ALGORITHM
from database import get_db
from models import User

# Use your real login path here if prefixed (e.g., "/api/login")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Decode JWT, validate, and return a minimal identity object.
    - Guest token: return {"id": <guest_uuid>, "role": "guest"}
    - User token : DB lookup by email (sub) then return {"id": <user_id>, "email": <email>, "role": "user"}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        token_type = payload.get("type")

        if not sub or not token_type:
            raise credentials_exception

        if token_type == "guest":
            return {"id": sub, "role": "guest"}

        if token_type == "user":
            user = db.query(User).filter(User.email == sub).first()
            if not user:
                raise credentials_exception
            return {"id": user.id, "email": user.email, "role": "user"}

        # Unknown token type
        raise credentials_exception

    except JWTError:
        raise credentials_exception

