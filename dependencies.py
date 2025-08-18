from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from utils.jwt_handler import SECRET_KEY, ALGORITHM
from database import get_db
from models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Decode JWT token, validate expiry.
    - If it's a user token -> fetch user from DB
    - If it's a guest token -> return guest info (no DB check)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        token_type: str = payload.get("type")

        if sub is None or token_type is None:
            raise credentials_exception

        # ✅ Case 1: Guest token (no DB lookup)
        if token_type == "guest":
            return {"id": sub, "role": "guest"}

        # ✅ Case 2: User token (check DB)
        user = db.query(User).filter(User.email == sub).first()
        if not user:
            raise credentials_exception

        return {"id": user.id, "email": user.email, "role": "user"}

    except JWTError:
        raise credentials_exception
