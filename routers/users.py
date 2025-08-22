from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import User
from dependencies import get_current_user
from utils.image_utils import get_full_image_url

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(get_current_user)]  # Enforce authentication
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    users_data = []
    for user in users:
        user_dict = user.__dict__.copy()
        user_dict.pop('_sa_instance_state', None)
        user_dict['profile_image'] = get_full_image_url(user_dict.get('profile_image'))
        users_data.append(user_dict)
    return {
        "isSuccess": True,
        "message": "User list retrieved successfully",
        "data": users_data
    }

@router.get("/users/{id}")
def get_user_by_id(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        return {
            "isSuccess": False,
            "message": "User not found",
            "data": None
        }
    user_dict = user.__dict__.copy()
    user_dict.pop('_sa_instance_state', None)
    user_dict['profile_image'] = get_full_image_url(user_dict.get('profile_image'))
    return {
        "isSuccess": True,
        "message": "User fetched successfully",
        "data": user_dict
    }

