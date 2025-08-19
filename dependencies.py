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

        # ✅ Guest token
        if token_type == "guest":
            return {"id": sub, "role": "guest"}

        # ✅ User token
        if token_type == "user":
            user = db.query(User).filter(User.email == sub).first()
            if not user:
                raise credentials_exception
            return {"id": user.id, "email": user.email, "role": "user"}

        raise credentials_exception

    except JWTError:
        raise credentials_exception
