from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import User, Category, Language
from schemas import UserProfileUpdate, UserProfileResponse, BaseResponse, UserEmailRequest, UserProfileWithServices
from dependencies import get_current_user
from schemas import UserEmailRequest, UserProfileWithServices
from utils.image_utils import get_full_image_url

router = APIRouter(tags=["Profile"],
    dependencies=[Depends(get_current_user)]  # ✅ Enforce authentication for all routes in this router)
)

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
        bio=user.bio,
        languages=user.languages,
        interests=user.interests,
    )
# services_count=len(user.services),
        #services=user.services,
"""
# -------- Get Current User Profile --------
@router.get("/me", response_model=BaseResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return BaseResponse(
        IsSucces=True,
        message="Profile retrieved successfully",
        data={"user": UserProfileResponse.from_orm(current_user)}
    )


# -------- Update Profile (current user) --------
@router.put("/update-profile", response_model=BaseResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = False

    if payload.name:
        current_user.name = payload.name
        updated = True
    if payload.bio:
        current_user.bio = payload.bio
        updated = True
    if payload.profile_image:
        current_user.profile_image = payload.profile_image
        updated = True

    # Update Languages
    if payload.languages is not None:
        langs = []
        for lang_name in payload.languages:
            lang = db.query(Language).filter(Language.name == lang_name).first()
            if not lang:
                lang = Language(name=lang_name)
                db.add(lang)
                db.commit()
                db.refresh(lang)
            langs.append(db.merge(lang))
        current_user.languages = langs
        updated = True

    # Update Interests
    if payload.interests is not None:
        cats = []
        for cat_name in payload.interests:
            cat = db.query(Category).filter(Category.name == cat_name).first()
            if not cat:
                cat = Category(name=cat_name)
                db.add(cat)
                db.commit()
                db.refresh(cat)
            cats.append(db.merge(cat))
        current_user.interests = cats
        updated = True

    if updated:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return BaseResponse(
        IsSucces=True,
        message="Profile updated successfully" if updated else "No changes made",
        data={"user": UserProfileResponse.from_orm(current_user)}
    )


# -------- Update Profile by ID (Admin/Manual) --------
@router.post("/update-profile/{user_id}", response_model=BaseResponse)
def update_user_profile_by_id(
    user_id: int,
    payload: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return BaseResponse(
            IsSucces=False,
            message=f"User with id {user_id} not found",
            data=None
        )

    updated = False

    if payload.name:
        user.name = payload.name
        updated = True
    if payload.bio:
        user.bio = payload.bio
        updated = True
    if payload.profile_image:
        user.profile_image = payload.profile_image
        updated = True

    # Update Languages
    if payload.languages is not None:
        langs = []
        for lang_name in payload.languages:
            lang = db.query(Language).filter(Language.name == lang_name).first()
            if not lang:
                lang = Language(name=lang_name)
                db.add(lang)
                db.commit()
                db.refresh(lang)
            langs.append(db.merge(lang))
        user.languages = langs
        updated = True

    # Update Interests
    if payload.interests is not None:
        cats = []
        for cat_name in payload.interests:
            cat = db.query(Category).filter(Category.name == cat_name).first()
            if not cat:
                cat = Category(name=cat_name)
                db.add(cat)
                db.commit()
                db.refresh(cat)
            cats.append(db.merge(cat))
        user.interests = cats
        updated = True

    if updated:
        db.add(user)
        db.commit()
        db.refresh(user)

    return BaseResponse(
        IsSucces=True,
        message=f"User {user_id} profile updated successfully" if updated else "No changes made",
        data={"user": UserProfileResponse.from_orm(user)}
    )
"""
