from sqlalchemy import Column, Integer, String, Table, ForeignKey, Float, Boolean, DateTime, Text, ARRAY,JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# Association Tables (Many-to-Many)
user_languages = Table(
    "user_languages",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("language_id", Integer, ForeignKey("languages.id")),
)

user_interests = Table(
    "user_interests",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("category_id", Integer, ForeignKey("categories.id")),
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, nullable=True)  # ✅ Google UID (optional)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for Google signup
    profile_image = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    city = Column(String)  # ✅ Add this
    register_type = Column(String, nullable=False, default="manual")  # manual or google_auth
    login_type = Column(String, nullable=False, default="manual")  # manual or google_auth
    status = Column(String, default="active")  # ✅ Add this
    is_active = Column(Boolean, default=True)

    otp_code = Column(String(4), nullable=True)  # 4-digit OTP
    otp_expiry = Column(DateTime, nullable=True)  # OTP expiry
    otp_verified = Column(Boolean, default=False)
    is_google_auth = Column(Boolean, default=False)  # True if registered via Google
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    guest_token = Column(String, nullable=True)
    # Relationships
    languages = relationship("Language", secondary=user_languages, back_populates="users")
    interests = relationship("Category", secondary=user_interests, back_populates="users")
     # Relationships
    services = relationship("Service", back_populates="owner")

     # Location / admin UI fields
    city = Column(String, nullable=True, index=True)   # shown in admin users list
    status = Column(String, nullable=False, default="active")  # active / inactive / banned
    is_active = Column(Boolean, default=True)  # boolean quick-check for active/inactive

     # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    tags = Column(ARRAY(String), nullable=True)   # ✅ ARRAY instead of JSON

    
    # Revenue / discount fields
    provider_share = Column(Float, nullable=False, default=80.0)
    seeker_share = Column(Float, nullable=False, default=20.0)
    discount_percentage = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", secondary=user_interests, back_populates="interests")

    # ✅ Correct back_populates
    services = relationship("Service", back_populates="category")


class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    users = relationship("User", secondary=user_languages, back_populates="languages")



class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))  # Link to category
    latitude = Column(Float, nullable=True)   # Optional, for location-based filtering
    longitude = Column(Float, nullable=True)
    # Relationship
    owner = relationship("User", back_populates="services")
    category = relationship("Category", back_populates="services")


# ------------------------
# FakeUser model (admin-created test users)
# ------------------------
class FakeUser(Base):
    __tablename__ = "fake_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    city = Column(String, nullable=False)
    target_audience = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ------------------------
# Settings model (simple single-row/kv fallback)
# ------------------------
class Settings(Base):
    """
    Simple settings table. You may prefer a key/value table or a single-row JSON config.
    This example uses a JSON column to hold settings such as revenue split and discount config.
    """
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), unique=True, nullable=True)  # optional: key-based entries
    value = Column(JSON, nullable=True)  # store arbitrary settings as JSON

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ------------------------
# Admin model
# ------------------------
class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)   # store only hashed password
    role = Column(String(50), nullable=False, default="admin")  # admin / superadmin
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
