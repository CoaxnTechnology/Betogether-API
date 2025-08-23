from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Request, status
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import User, Category, Language,Category
from schemas import UserProfileUpdate, UserProfileResponse, BaseResponse, UserEmailRequest, UserProfileWithServices,LanguageOut, CategoryOut
from dependencies import get_current_user
from schemas import UserEmailRequest, UserProfileWithServices
from utils.image_utils import get_full_image_url
from utils.storage import get_storage
from utils.validators import validate_image_upload, normalize_string_list
from utils.image_utils import get_full_image_url
import os 

router = APIRouter(tags=["Profile"],
    dependencies=[Depends(get_current_user)]  # ✅ Enforce authentication for all routes in this router)
)

UPLOAD_DIR = "static/profile_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# profile.py
@router.post("/user/profile", response_model=UserProfileWithServices)
def get_user_profile_by_email(
    request: UserEmailRequest, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfileWithServices(
        id=user.id,
        name=user.name,
        email=user.email,
        profile_image=get_full_image_url(user.profile_image),
        bio=user.bio or "",
        languages=user.languages,
        interests=user.interests,
    )
# services_count=len(user.services),
        #services=user.services,

@router.put("/update/profile")
async def edit_profile(
    request: Request,
    email: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    languages: List[int] = Form([]),
    interests: List[int] = Form([]),
    profile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # --- Identify user ---
    if email:
        user = db.query(User).filter(User.email == email).first()
    else:
        user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        return {
            "isSuccess": False,
            "message": "User not found",
            "data": None
        }

    # --- Update fields ---
    if name is not None:
        if not name.strip():
            return {
                "isSuccess": False,
                "message": "Name cannot be empty",
                "data": None
            }
        user.name = name.strip()

    if bio is not None:
        user.bio = bio.strip()

    if profile_image is not None:
        validate_image_upload(profile_image)
        storage = get_storage()
        stored_url = await storage.store_profile_image(profile_image, request)
        user.profile_image = stored_url

    if languages:
        found_langs = db.query(Language).filter(Language.id.in_(languages)).all()
        if len(found_langs) != len(languages):
            return {
                "isSuccess": False,
                "message": "Some languages not found",
                "data": None
            }
        user.languages = found_langs

    if interests:
        found_cats = db.query(Category).filter(Category.id.in_(interests)).all()
        if len(found_cats) != len(interests):
            return {
                "isSuccess": False,
                "message": "Some interests not found",
                "data": None
            }
        user.interests = found_cats

    db.commit()
    db.refresh(user)

    # --- Success Response ---
    return {
        "isSuccess": True,
        "message": "Profile updated successfully",
        "data": {
            "id": user.id,
            "uid": user.uid,
            "name": user.name,
            "email": user.email,
            "profile_image": get_full_image_url(user.profile_image),
            "bio": user.bio,
            "languages": [LanguageOut.from_orm(l) for l in user.languages],
            "interests": [CategoryOut.from_orm(c) for c in user.interests],         
        }
    }
