from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Category, User
from database import get_db
from schemas import CategoryOut, UserLocation
from dependencies import get_current_user  # ✅ Token validation
import math

router = APIRouter(
    tags=["Category"],
    dependencies=[Depends(get_current_user)]  # ✅ Enforce authentication for all routes
)

BASE_URL = "http://31.97.231.30"  

# ✅ DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Haversine formula for distance calculation
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

# -------- Get All Categories --------
@router.get("/category")
def get_all_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return {
        "IsSuccess": True,
        "message": "Categories retrieved successfully" if categories else "No categories found",
        "data": categories
    }

# -------- Get Category by ID or Name --------
@router.get("/category/{identifier}")
def get_category(identifier: str, db: Session = Depends(get_db)):
    if identifier.isdigit():
        category = db.query(Category).filter(Category.id == int(identifier)).first()
    else:
        category = db.query(Category).filter(Category.name.ilike(identifier)).first()

    if not category:
        return {"IsSuccess": False, "message": "Category not found"}

    return {"IsSuccess": True, "message": "Category retrieved successfully", "data": category}

@router.post("/category/nearest")
def assign_nearest_category(location: UserLocation, db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    if not categories:
        return {
            "IsSuccess": False,
            "message": "No categories found",
            "categories": []
        }

    # calculate distances
    distances = []
    for cat in categories:
        if cat.latitude is None or cat.longitude is None:
            continue
        dist = haversine(location.latitude, location.longitude, cat.latitude, cat.longitude)
        distances.append({
            "id": cat.id,
            "category": cat.name,
            "image": f"{BASE_URL}{cat.image}" if not cat.image.startswith("http") else cat.image,
            "latitude": cat.latitude,
            "longitude": cat.longitude,
            "distance_km": round(dist, 2)
        })

    # sort by distance
    distances.sort(key=lambda x: x["distance_km"])

    # ✅ CASE 1: user gave a radius
    if location.radius_km:
        filtered = [c for c in distances if c["distance_km"] <= location.radius_km]
        if not filtered:
            return {
                "IsSuccess": False,
                "message": "No categories available in this location.",
                "categories": distances  # all categories with distance, sorted
            }
        return {
            "IsSuccess": True,
            "message": f"{len(filtered)} category(s) found within {location.radius_km} km",
            "categories": filtered
        }

    # ✅ CASE 2: no radius → only nearest category(s)
    if not distances:
        return {
            "IsSuccess": False,
            "message": "No valid categories with coordinates",
            "categories": []
        }

    nearest_distance = distances[0]["distance_km"]
    nearest_categories = [c for c in distances if c["distance_km"] == nearest_distance]

    return {
        "IsSuccess": True,
        "message": f"Nearest category found ({len(nearest_categories)} result(s))",
        "categories": nearest_categories
    }
