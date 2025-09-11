# dependencies.py
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from utils.jwt_handler import SECRET_KEY, ALGORITHM
from database import get_db
from models import User, Admin

# OAuth2 token url (used for Swagger UI login buttons)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


def _credentials_exception(detail: str = "Invalid or expired token."):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Decode JWT and return context:
      - guest: {"id": <uuid>, "role": "guest"}
      - user_access: {"id": user.id, "email": user.email, "role": "user", "model": <User>}
      - user_refresh: {"id": user.id, "email": user.email, "role": "user_refresh", "model": <User>}
      - admin: {"id": admin.id, "email": admin.email, "role": admin.role, "is_admin": True, "model": <Admin>}
    """
    if not token:
        raise _credentials_exception()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise _credentials_exception()

    sub = payload.get("sub")
    token_type = payload.get("type")

    if not sub or not token_type:
        raise _credentials_exception()

    # Guest
    if token_type == "guest":
        return {"id": sub, "role": "guest"}

    # User (Access or Refresh)
    if token_type in ("user_access", "user_refresh"):
        user = db.query(User).filter(User.email == sub).first()
        if not user:
            raise _credentials_exception("User not found")
        return {"id": user.id, "email": user.email, "role": token_type, "model": user}

    # Admin
    if token_type == "admin":
        admin = db.query(Admin).filter(Admin.email == sub).first()
        if not admin:
            raise _credentials_exception("Admin not found")
        return {"id": admin.id, "email": admin.email, "role": "admin", "is_admin": True, "model": admin}

    raise _credentials_exception()


# -------- ROLE GUARDS --------
def guest_required(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current.get("role") != "guest":
        raise HTTPException(status_code=403, detail="Guest access required")
    return current


def user_required(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current.get("role") not in ("user_access", "user_refresh"):
        raise HTTPException(status_code=403, detail="User access required")
    return current


def admin_required(current: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if current.get("is_admin") or current.get("role") == "admin":
        return current

    raise HTTPException(status_code=403, detail="Admin access required")
