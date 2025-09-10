from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import auth, users, category, search, profile, guest
from database import SessionLocal, engine
from models import Category, Base
from contextlib import asynccontextmanager
from fastapi.responses import HTMLResponse
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

BASE_URL = "http://31.97.231.30"

def seed_default_categories():
    db = SessionLocal()

    default_categories = [
        {
            "name": "Pet Care",
            "image": f"{BASE_URL}/static/icons/pet.png",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "tags": ["dog sitter", "pet care", "dog walking", "pet sitting"]
        },
        {
            "name": "Childcare",
            "image": f"{BASE_URL}/static/icons/childcare.png",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "tags": ["baby sitter", "childcare", "babysitting", "child supervision"]
        },
        {
            "name": "Household Maintenance",
            "image": f"{BASE_URL}/static/icons/house.png",
            "latitude": 51.5074,
            "longitude": -0.1278,
            "tags": ["house chores", "cleaning", "ironing", "household fixes", "home maintenance"]
        },
        {
            "name": "Academic Support",
            "image": f"{BASE_URL}/static/icons/academic.png",
            "latitude": 35.6895,
            "longitude": 139.6917,
            "tags": ["school tutoring", "academic support", "math tutoring", "English tutoring", "education"]
        },
        {
            "name": "Home Repairs and Assembly",
            "image": f"{BASE_URL}/static/icons/repairs.png",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "tags": ["small jobs", "plumbing", "electrician", "furniture assembly", "home repairs"]
        },
        {
            "name": "Elderly Care",
            "image": f"{BASE_URL}/static/icons/elderly.png",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "tags": ["elderly assistance", "senior care", "companionship", "errands", "medication help"]
        },
        {
            "name": "Moving Services",
            "image": f"{BASE_URL}/static/icons/moving.png",
            "latitude": 55.7558,
            "longitude": 37.6173,
            "tags": ["moving help", "furniture moving", "box moving", "relocation assistance"]
        },
        {
            "name": "Language Services",
            "image": f"{BASE_URL}/static/icons/language.png",
            "latitude": -33.8688,
            "longitude": 151.2093,
            "tags": ["translations", "document translation", "CV translation", "language services"]
        },
        {
            "name": "Garden and Plant Maintenance",
            "image": f"{BASE_URL}/static/icons/garden.png",
            "latitude": 52.5200,
            "longitude": 13.4050,
            "tags": ["garden care", "plant care", "watering plants", "green space maintenance", "gardening"]
        },
        {
            "name": "Translator",
            "image": f"{BASE_URL}/static/icons/translator.png",
            "latitude": 41.9028,
            "longitude": 12.4964,
            "tags": ["translation services", "language translation", "document translation", "interpreter", "multilingual"]
        },
        {
            "name": "Plumber",
            "image": f"{BASE_URL}/static/icons/plumber.png",
            "latitude": 40.4168,
            "longitude": -3.7038,
            "tags": ["plumbing", "pipe repair", "leak fixing", "drainage", "water heater repair"]
        },
        {
            "name": "Cooking",
            "image": f"{BASE_URL}/static/icons/cooking.png",
            "latitude": 59.3293,
            "longitude": 18.0686,
            "tags": ["cooking services", "meal preparation", "catering", "home chef", "culinary"]
        },
        {
            "name": "Join an Event",
            "image": f"{BASE_URL}/static/icons/event.png",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "tags": ["event participation", "event registration", "community events", "social gatherings", "event planning"]
        },
        {
            "name": "Explore Area",
            "image": f"{BASE_URL}/static/icons/explore.png",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "tags": ["local exploration", "sightseeing", "travel guide", "area tours", "local attractions"]
        },
        {
            "name": "Attend Show",
            "image": f"{BASE_URL}/static/icons/show.png",
            "latitude": 1.3521,
            "longitude": 103.8198,
            "tags": ["theater tickets", "live performances", "concerts", "show bookings", "entertainment"]
        },
        {
            "name": "Transport",
            "image": f"{BASE_URL}/static/icons/transport.png",
            "latitude": -23.5505,
            "longitude": -46.6333,
            "tags": ["transportation", "delivery services", "logistics", "shipping", "cargo"]
        },
        {
            "name": "Sports",
            "image": f"{BASE_URL}/static/icons/sports.png",
            "latitude": 25.276987,
            "longitude": 55.296249,
            "tags": ["sports activities", "fitness", "team sports", "sports events", "training"]
        },
        {
            "name": "Keep Company",
            "image": f"{BASE_URL}/static/icons/company.png",
            "latitude": 35.6762,
            "longitude": 139.6503,
            "tags": ["companionship", "social support", "elderly companionship", "friend services", "conversation"]
        },
        {
            "name": "Find a Ride",
            "image": f"{BASE_URL}/static/icons/ride.png",
            "latitude": 45.4642,
            "longitude": 9.1900,
            "tags": ["ride sharing", "carpool", "taxi services", "transportation booking", "travel assistance"]
        },
        {
            "name": "Fashion & Beauty",
            "image": f"{BASE_URL}/static/icons/fashion.png",
            "latitude": 30.0444,
            "longitude": 31.2357,
            "tags": ["makeup", "stylist", "salon", "skincare", "cosmetics"]
        },
        {
            "name": "Party",
            "image": f"{BASE_URL}/static/icons/party.png",
            "latitude": 13.7563,
            "longitude": 100.5018,
            "tags": ["DJ", "makeup artist", "musicians", "entertainers", "party planning"]
        }
    ]

    for cat in default_categories:
        existing = db.query(Category).filter_by(name=cat["name"]).first()
        if not existing:
            db.add(Category(
                name=cat["name"],
                image=cat["image"],
                latitude=cat["latitude"],
                longitude=cat["longitude"],
                tags=cat["tags"]
            ))

    db.commit()
    db.close()
    print("✅ Default categories with tags + image + lat/long seeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ✅ Ensure tables exist first
    Base.metadata.create_all(bind=engine)
    seed_default_categories()
    yield
    # Shutdown code (if any)

app = FastAPI(title="BETOGETHER API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(guest.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(category.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(profile.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "BETOGETHER API is running"}


@app.get("/terms", response_class=HTMLResponse)
def get_terms():
    file_path = os.path.join(TEMPLATES_DIR, "terms_and_conditions.html")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

