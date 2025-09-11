from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Union
from datetime import datetime

# ---------- Registration ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    password: str
    profile_image: Optional[str] = None
    register_type: str  # manual / google_auth
    uid: Optional[str] = None  # Google UID (optional)

# ---------- Login ----------
class UserLogin(BaseModel):
    email: EmailStr
    password: str = None  # Optional for google_auth
    login_type: str # manual/google_auth 
    uid:Optional[str] = None #google uid (optional)


# ---------- OTP Verification ----------
class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


# ---------- Tokens ----------
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GuestTokenSchema(BaseModel):
    guest_token: str
    token_type: str = "bearer"
    
    class config:
        orm_mode:True

# ---------- Category ----------
class CategoryOut(BaseModel):
    id: int
    name: str
    image: Optional[str] = None
    latitude: Optional[float] = None   # ✅ allows None
    longitude: Optional[float] = None  # ✅ allows None
    tags: List[str] = []   # ✅ array in API response
    # Admin fields
    provider_share: Optional[float] = 80.0
    seeker_share: Optional[float] = 20.0
    discount_percentage: Optional[float] = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CategoryIDName(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


# ---------- Language ----------
class LanguageOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# ---------- Profile Update ----------
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    languages: Optional[List[str]] = None  # language IDs only
    interests: Optional[List[str]] = None  # category IDs only"""


# ---------- Profile Response ----------
class UserProfileResponse(BaseModel):
    id: int
    uid:Optional[str]
    name: str
    email: EmailStr
    mobile: str
    profile_image: Optional[str]
    bio: Optional[str]
    languages: List[LanguageOut] = []
    interests: List[CategoryOut] = []
    login_type: str
    register_type: str
    otp_verified: bool

    class Config:
        from_attributes = True


# ---------- Minimal User Response ----------
class UserResponse(BaseModel):
    id: int
    uid: Optional[str] = None
    name: str
    email: EmailStr
    mobile: str
    profile_image: Optional[str] = None
    register_type: Optional[str] = None
    login_type:Optional[str]=None
    otp_verified: bool

    # Admin list-friendly fields
    city: Optional[str] = None
    status: Optional[str] = "active"
    is_active: Optional[bool] = True
    login_provider: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Fake User Schema ----------
class FakeUserCreate(BaseModel):
    name: Optional[str] = None  # if not provided generator will create one
    email: Optional[EmailStr] = None
    city: str
    target_audience: Optional[str] = None

class FakeUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    city: str
    target_audience: Optional[str] = None
    status: Optional[str] = "active"
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# ---------- Auth Response ----------
class AuthResponse(BaseModel):
    IsSucces: bool
    message: Optional[str]
    access_token: Optional[str]
    refresh_token: Optional[str]
    token_type: str = "bearer"
    user: Optional[Union[UserResponse, UserProfileResponse]]


# ---------- Base Response ----------
class BaseResponse(BaseModel):
    IsSuccess: bool
    message: Optional[str] = None
    data: Optional[dict] = None


# ---------- Token Refresh ----------
class TokenRefreshRequest(BaseModel):
    refresh_token: str


# ---------- User Location ----------
class UserLocation(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = None  # optional filtering

class UserEmailRequest(BaseModel):
    email: EmailStr


# ---------- Settings / Revenue ----------
class RevenueSplit(BaseModel):
    provider: float
    seeker: float
    platform: float

class DiscountSettings(BaseModel):
    global_discount: Optional[float] = 0.0
    category_wise: Optional[bool] = False
    seasonal: Optional[bool] = False

class AdminSettingsOut(BaseModel):
    revenue_split: RevenueSplit
    discounts: DiscountSettings

    class Config:
        orm_mode = True

# ---------- Admin Schemas ----------

class AdminCreate(BaseModel):
    """Schema for creating a new admin (registration)."""
    name: str
    email: EmailStr
    password: str  # plain password, will be hashed before storing


class AdminLogin(BaseModel):
    """Schema for admin login."""
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    """Schema for returning admin details (safe response)."""
    id: int
    name: str
    email: EmailStr
    role: Optional[str] = "admin"
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


class AdminAuthResponse(BaseModel):
    """Schema for admin login response with token."""
    IsSuccess: bool
    message: Optional[str] = None
    admin_token: Optional[str] = None
    token_type: str = "bearer"
    admin: Optional[AdminOut] = None

class UserProfileWithServices(BaseModel):
    id: int
    name: str
    email: EmailStr
    profile_image: Optional[str]
    bio: Optional[str]
    languages: List[LanguageOut]
    interests: List[CategoryOut]

    class Config:
        from_attributes = True
