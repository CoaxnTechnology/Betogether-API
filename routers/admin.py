# routers/admin.py
import os
import io
import csv
import uuid
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from functools import lru_cache

import requests
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from models import Admin   # model with admin info
from faker import Faker
from passlib.context import CryptContext
from jose import jwt
from utils import jwt_handler
from dependencies import get_current_user
from database import get_db
import models

router = APIRouter(prefix="/admin", tags=["admin"])

# ---------- Configuration ----------
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# NOTE: HRFlow removed; we now use TagInfo (OpenStreetMap) for tag suggestions
TAGINFO_BASE = "https://taginfo.openstreetmap.org/api/4/key/values"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
fake = Faker()

# Allowed cities grouped (from your spec)
ALLOWED_CITIES = [
    {"country": "Italy", "cities": [
        {"name": "Milan", "lat": 45.4642, "long": 9.1900},
        {"name": "Rome", "lat": 41.9028, "long": 12.4964},
        {"name": "Bologna", "lat": 44.4949, "long": 11.3426},
        {"name": "Florence", "lat": 43.7696, "long": 11.2558},
        {"name": "Turin", "lat": 45.0703, "long": 7.6869},
    ]},
    {"country": "Spain", "cities": [
        {"name": "Barcelona", "lat": 41.3851, "long": 2.1734},
        {"name": "Madrid", "lat": 40.4168, "long": -3.7038},
        {"name": "Valencia", "lat": 39.4699, "long": -0.3763},
        {"name": "Granada", "lat": 37.1773, "long": -3.5986},
        {"name": "Malaga", "lat": 36.7213, "long": -4.4213},
    ]},
    {"country": "France", "cities": [
        {"name": "Paris", "lat": 48.8566, "long": 2.3522},
        {"name": "Lyon", "lat": 45.7640, "long": 4.8357},
        {"name": "Marseille", "lat": 43.2965, "long": 5.3698},
        {"name": "Montpellier", "lat": 43.6108, "long": 3.8767},
        {"name": "Nice", "lat": 43.7102, "long": 7.2620},
    ]},
    {"country": "Germany", "cities": [
        {"name": "Berlin", "lat": 52.5200, "long": 13.4050},
        {"name": "Munich", "lat": 48.1351, "long": 11.5820},
        {"name": "Hamburg", "lat": 53.5511, "long": 9.9937},
        {"name": "Cologne", "lat": 50.9375, "long": 6.9603},
        {"name": "Freiburg", "lat": 47.9990, "long": 7.8421},
    ]},
    {"country": "Portugal", "cities": [
        {"name": "Lisbon", "lat": 38.7223, "long": -9.1393},
        {"name": "Porto", "lat": 41.1579, "long": -8.6291},
        {"name": "Faro", "lat": 37.0194, "long": -7.9307},
        {"name": "Coimbra", "lat": 40.2033, "long": -8.4103},
        {"name": "Braga", "lat": 41.5454, "long": -8.4265},
    ]},
    {"country": "United Kingdom", "cities": [
        {"name": "London", "lat": 51.5074, "long": -0.1278},
        {"name": "Manchester", "lat": 53.4830, "long": -2.2446},
        {"name": "Bristol", "lat": 51.4545, "long": -2.5879},
        {"name": "Brighton", "lat": 50.8225, "long": -0.1372},
        {"name": "Leeds", "lat": 53.8008, "long": -1.5491},
    ]},
]
ALLOWED_CITY_NAMES = {c["name"] for country in ALLOWED_CITIES for c in country["cities"]}

# ---------- Limits ----------
MAX_TAGS = 20                # <- final: tag max 20
MAX_FAKE_USER_GENERATE = 200

def admin_required(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.get("role") != "superadmin" and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only."
        )
    return current_user
    
# ---------- Utilities ----------
def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ---------- TagInfo sanitization & helpers ----------
# Allowed characters: letters, numbers, spaces, hyphen, underscore; length limits to avoid noise
_VALID_TAG_RE = re.compile(r"^[\w\s-]{2,60}$", re.UNICODE)

def sanitize_raw_value(v: Optional[str]) -> Optional[str]:
    """
    Clean raw TagInfo value. Returns cleaned string or None if rejected.
    Rejects JSON-like strings, semicolon/comma lists, strings with quotes/backslashes,
    or those containing excessive punctuation.
    """
    if not v or not isinstance(v, str):
        return None
    s = v.strip()
    # reject JSON-like or bracketed structures
    if s.startswith("{") or s.endswith("}") or s.startswith("[") or s.endswith("]"):
        return None
    # reject semicolon/comma lists (these were the noisy ones in screenshots)
    if ";" in s or "," in s:
        return None
    # reject values containing quotes/backslashes/angle brackets/equals
    if any(ch in s for ch in ['"', "'", "\\", "<", ">", "="]):
        return None
    # normalize underscores -> spaces and collapse whitespace
    s_norm = s.replace("_", " ").strip()
    s_norm = re.sub(r"\s+", " ", s_norm)
    # enforce allowed characters and length
    if not _VALID_TAG_RE.match(s_norm):
        return None
    # everything ok; return lowercase normalized string for consistent matching (display handled separately)
    return s_norm.lower()


@lru_cache(maxsize=256)
def taginfo_fetch_values_for_key(key: str, rp: int = 200) -> List[str]:
    """
    Fetch values for a TagInfo key (key/values endpoint).
    Returns sanitized and deduplicated lowercase values.
    Cached with LRU cache to reduce external calls.
    """
    try:
        url = f"{TAGINFO_BASE}?key={key}&page=1&rp={rp}"
        r = requests.get(url, timeout=6)
        if r.status_code != 200:
            return []
        j = r.json()
        data = j.get("data") if isinstance(j, dict) else None
        values: List[str] = []
        if isinstance(data, list):
            for item in data:
                v = item.get("value")
                cleaned = sanitize_raw_value(v)
                if cleaned:
                    values.append(cleaned)
        # dedupe while preserving order
        unique = list(dict.fromkeys(values))
        return unique
    except Exception:
        return []


def normalize_tag_for_storage(raw: str) -> str:
    """
    Storage normalization: lowercase, underscores -> spaces, trim, remove unwanted punctuation, collapse spaces.
    """
    if not raw:
        return raw
    s = raw.strip().lower()
    s = s.replace("_", " ")
    # remove characters other than word/space/hyphen
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def prettify_tag_for_display(raw: str) -> str:
    """
    Convert a normalized stored tag into a display label, e.g. "fast food" -> "Fast Food".
    """
    if not raw:
        return raw
    s = raw.replace("_", " ").strip()
    return " ".join([p.capitalize() for p in s.split()])


def fallback_tags_from_name(name: str, n: int = 5) -> List[str]:
    """
    Simple fallback: split words from the name, drop trivial stopwords, return up to n tags.
    """
    stop = {"and", "the", "of", "in", "for", "with", "a", "an", "to"}
    parts = [p.strip().lower() for p in name.replace("/", " ").split() if p.strip()]
    tags = [p for p in parts if p not in stop]
    # normalize and ensure uniqueness
    out = []
    for t in tags:
        nt = normalize_tag_for_storage(t)
        if nt and nt not in out:
            out.append(nt)
        if len(out) >= n:
            break
    return out[:n]


def taginfo_generate_tags_from_name(name: str, top_n: int = 6) -> List[str]:
    """
    Generate tags using TagInfo:
      - Tokenize the name
      - Try a set of candidate TagInfo keys and match values
    Returns up to top_n normalized tags.
    """
    if not name or not name.strip():
        return []
    name_norm = name.lower()
    tokens = [t for t in [p.strip() for p in name_norm.replace("/", " ").split() if p.strip()] if len(t) > 1]
    if not tokens:
        return []

    candidate_keys = ["cuisine", "amenity", "shop", "craft", "service"]
    matched: List[str] = []
    try:
        for key in candidate_keys:
            # fetch larger rp to improve hit rate (cached)
            values = taginfo_fetch_values_for_key(key, rp=500)
            if not values:
                continue
            for v in values:
                v_norm = normalize_tag_for_storage(v)
                for t in tokens:
                    t_norm = normalize_tag_for_storage(t)
                    if not t_norm:
                        continue
                    # permissive matching: exact or substring either way
                    if t_norm == v_norm or t_norm in v_norm or v_norm in t_norm:
                        if v_norm not in matched:
                            matched.append(v_norm)
                            if len(matched) >= top_n:
                                break
                if len(matched) >= top_n:
                    break
            if len(matched) >= top_n:
                break
    except Exception:
        matched = []
    # final normalization + dedupe + cap at MAX_TAGS
    final: List[str] = []
    for m in matched:
        nm = normalize_tag_for_storage(m)
        if nm and nm not in final:
            final.append(nm)
        if len(final) >= top_n or len(final) >= MAX_TAGS:
            break
    return final[:top_n]


# ---------- Pydantic req models ----------
from pydantic import BaseModel, EmailStr

class AdminLoginReq(BaseModel):
    email: EmailStr
    password: str


# Admin Login (Generate Admin Token)
# ---------------------------
@router.post("/login")
def admin_login(payload: AdminLoginReq, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # TODO: verify hashed password (bcrypt) - currently comparing raw (update in production)
    if admin.hashed_password != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = jwt_handler.create_admin_token({"sub": admin.email, "id": admin.id, "role": admin.role})
    return {"access_token": token, "token_type": "bearer", "role": "admin"}


# ---------- Quick actions (Dashboard) ----------
@router.get("/quick-actions")
def quick_actions(_: Any = Depends(admin_required)):
    actions = [
        {"id": "create_category", "label": "Create Category", "icon": "tag", "route": "/categories"},
        {"id": "generate_fake_users", "label": "Generate Fake Users", "icon": "user-plus", "route": "/fake-users"},
        {"id": "export_users_csv", "label": "Download Users CSV", "icon": "download", "route": "/users/export"},
        {"id": "manage_settings", "label": "Settings", "icon": "settings", "route": "/settings"},
    ]
    return {"IsSuccess": True, "data": {"actions": actions}}


# ---------- Cities endpoint (dropdown data) ----------
@router.get("/cities")
def get_cities(_: Any = Depends(admin_required)):
    return {"IsSuccess": True, "data": {"cities": ALLOWED_CITIES}}


# ---------- Dashboard ----------
@router.get("/dashboard")
def get_dashboard(days: int = 30, db: Session = Depends(get_db), _ = Depends(admin_required)):
    since = datetime.utcnow() - timedelta(days=days)
    user_count = db.query(func.count(models.User.id)).scalar() or 0
    cat_count = db.query(func.count(models.Category.id)).scalar() or 0
    fake_count = db.query(func.count(models.FakeUser.id)).scalar() or 0
    service_count = db.query(func.count(models.Service.id)).scalar() or 0

    users_by_city = db.query(models.User.city, func.count(models.User.id)).group_by(models.User.city).all()
    city_distribution = [{"city": city if city else "unknown", "count": count} for city, count in users_by_city]

    login_type_counts = db.query(models.User.login_type, func.count(models.User.id)).group_by(models.User.login_type).all()
    login_distribution = [{"login_type": lt if lt else "unknown", "count": count} for lt, count in login_type_counts]

    recent = db.query(models.User).filter(models.User.created_at >= since).order_by(desc(models.User.created_at)).limit(10).all()
    recent_users = [{"id": u.id, "name": u.name, "email": u.email, "city": u.city, "login_type": u.login_type, "created_at": u.created_at} for u in recent]

    return {"IsSuccess": True, "data": {"counts": {"users": user_count, "categories": cat_count, "fake_users": fake_count, "services": service_count}, "city_distribution": city_distribution, "login_distribution": login_distribution, "recent_users": recent_users, "since": since}}


# ---------- Users ----------
@router.get("/users")
def get_users(login_type: Optional[str] = Query(None), city: Optional[str] = Query(None), skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _ = Depends(admin_required)):
    q = db.query(models.User)
    if login_type:
        q = q.filter(models.User.login_type == login_type)
    if city:
        q = q.filter(models.User.city == city)
    total = q.count()
    users = q.order_by(desc(models.User.created_at)).offset(skip).limit(limit).all()
    out = [{"id": u.id, "name": u.name, "email": u.email, "login_type": u.login_type, "login_provider": u.login_provider if hasattr(u, "login_provider") else None, "city": u.city, "status": getattr(u, "status", "active"), "role": getattr(u, "role", None), "created_at": u.created_at} for u in users]
    return {"IsSuccess": True, "data": {"total": total, "users": out}}


# ---------- Users CSV export (useful for Quick Actions) ----------
@router.get("/users/export")
def export_users(db: Session = Depends(get_db), _ = Depends(admin_required)):
    q = db.query(models.User).order_by(models.User.id).all()
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(["id", "name", "email", "city", "login_type", "status", "created_at"])
    for u in q:
        writer.writerow([u.id, u.name, u.email, getattr(u, "city", ""), getattr(u, "login_type", ""), getattr(u, "status", ""), u.created_at.isoformat() if u.created_at else ""])
    si.seek(0)
    return StreamingResponse(io.BytesIO(si.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=users.csv"})


# ---------- Categories CRUD ----------
@router.get("/categories")
def list_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _ = Depends(admin_required)):
    """
    Return categories, newest first by created_at (frontend expects most-recent first).
    """
    q = db.query(models.Category)
    total = q.count()
    cats = q.order_by(desc(models.Category.created_at)).offset(skip).limit(limit).all()
    out = [
        {
            "id": c.id,
            "name": c.name,
            "image": c.image,
            "tags": list(c.tags) if c.tags else [],
            "provider_share": getattr(c, "provider_share", None),
            "seeker_share": getattr(c, "seeker_share", None),
            "discount_percentage": getattr(c, "discount_percentage", None),
            "created_at": c.created_at,
        }
        for c in cats
    ]
    return {"IsSuccess": True, "data": {"total": total, "categories": out}}


@router.post("/categories")
def create_category(
    name: str = Form(...),
    provider_share: float = Form(80.0),
    seeker_share: float = Form(20.0),
    discount_percentage: float = Form(0.0),
    image_file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _ = Depends(admin_required),
):
    """
    Create a category, auto-generate tags (TagInfo -> fallback), save image (file or URL).
    """
    # basic validation
    try:
        provider_share = float(provider_share)
        seeker_share = float(seeker_share)
        discount_percentage = float(discount_percentage)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid numeric values for shares/discount")

    if provider_share < 0 or seeker_share < 0 or discount_percentage < 0:
        raise HTTPException(status_code=400, detail="Percents must be non-negative")

    if provider_share + seeker_share > 100:
        raise HTTPException(status_code=400, detail="Provider + Seeker percentage must not exceed 100")

    # uniqueness
    existing = db.query(models.Category).filter(func.lower(models.Category.name) == name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    image_path = None
    if image_file:
        try:
            ext = Path(image_file.filename).suffix or ".jpg"
            fname = f"{uuid.uuid4().hex}{ext}"
            out_path = Path(UPLOAD_DIR) / fname
            with out_path.open("wb") as f:
                f.write(image_file.file.read())
            image_path = f"/{UPLOAD_DIR.rstrip('/')}/{fname}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded image: {str(e)}")
    elif image_url:
        image_path = image_url

    # attempt TagInfo tag generation, then fallback to simple tokens
    tags: List[str] = []
    try:
        # prefer a modest top_n (MAX_TAGS) but taginfo generator itself uses permissive matching
        tags = taginfo_generate_tags_from_name(name, top_n=MAX_TAGS)
    except Exception:
        tags = []
    if not tags:
        tags = fallback_tags_from_name(name, n=MAX_TAGS)

    # normalize & cap tags
    tags = [normalize_tag_for_storage(t) for t in (tags or []) if isinstance(t, str)]
    tags = list(dict.fromkeys(tags))[:MAX_TAGS]

    # create model and persist
    cat = models.Category(
        name=name,
        image=image_path,
        latitude=None,
        longitude=None,
        tags=tags,
        provider_share=provider_share,
        seeker_share=seeker_share,
        discount_percentage=discount_percentage,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    return {
        "IsSuccess": True,
        "message": "Category created",
        "data": {
            "category": {
                "id": cat.id,
                "name": cat.name,
                "image": cat.image,
                "tags": cat.tags,
                "provider_share": cat.provider_share,
                "seeker_share": cat.seeker_share,
                "discount_percentage": cat.discount_percentage,
                "created_at": cat.created_at,
            }
        },
    }


@router.put("/categories/{category_id}")
def update_category(
    category_id: int,
    name: Optional[str] = Form(None),
    provider_share: Optional[float] = Form(None),
    seeker_share: Optional[float] = Form(None),
    discount_percentage: Optional[float] = Form(None),
    image_url: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _ = Depends(admin_required),
):
    """
    Update category metadata. tags may be submitted as comma-separated string or JSON array.
    """
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if name:
        # check name uniqueness
        existing = db.query(models.Category).filter(func.lower(models.Category.name) == name.lower(), models.Category.id != category_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another category with this name already exists")
        cat.name = name

    if provider_share is not None:
        cat.provider_share = float(provider_share)
    if seeker_share is not None:
        cat.seeker_share = float(seeker_share)
    if discount_percentage is not None:
        cat.discount_percentage = float(discount_percentage)
    if image_url:
        cat.image = image_url

    if tags is not None:
        parsed = []
        if isinstance(tags, str):
            try:
                import json
                parsed_json = json.loads(tags)
                if isinstance(parsed_json, list):
                    parsed = [str(t).strip() for t in parsed_json if str(t).strip()]
                else:
                    parsed = [t.strip() for t in tags.split(",") if t.strip()]
            except Exception:
                parsed = [t.strip() for t in tags.split(",") if t.strip()]
        elif isinstance(tags, list):
            parsed = tags
        if len(parsed) > MAX_TAGS:
            raise HTTPException(status_code=400, detail=f"Max {MAX_TAGS} tags allowed")
        # normalize tags on update as well
        parsed_norm = [normalize_tag_for_storage(t) for t in parsed if isinstance(t, str)]
        cat.tags = list(dict.fromkeys(parsed_norm))[:MAX_TAGS]

    db.commit()
    db.refresh(cat)
    return {"IsSuccess": True, "message": "Category updated", "data": {"id": cat.id, "name": cat.name, "tags": cat.tags}}


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), _ = Depends(admin_required)):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"IsSuccess": True, "message": "Category deleted"}


@router.get("/categories/export")
def export_categories(db: Session = Depends(get_db), _ = Depends(admin_required)):
    """
    Export categories to CSV (id,name,tags,provider,seeker,discount,image,created_at)
    """
    q = db.query(models.Category).order_by(desc(models.Category.created_at)).all()
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(["id", "name", "tags", "provider_share", "seeker_share", "discount_percentage", "image", "created_at"])
    for c in q:
        tags_field = "|".join(c.tags) if c.tags else ""
        writer.writerow([c.id, c.name, tags_field, getattr(c, "provider_share", ""), getattr(c, "seeker_share", ""), getattr(c, "discount_percentage", ""), c.image or "", c.created_at.isoformat() if c.created_at else ""])
    si.seek(0)
    return StreamingResponse(io.BytesIO(si.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=categories.csv"})


# ---------- Fake Users ----------
@router.get("/fake-users")
def list_fake_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _ = Depends(admin_required)):
    q = db.query(models.FakeUser)
    total = q.count()
    items = q.order_by(desc(models.FakeUser.created_at)).offset(skip).limit(limit).all()
    out = [{"id": f.id, "name": f.name, "email": f.email, "city": f.city, "target_audience": f.target_audience, "status": f.status, "created_at": f.created_at} for f in items]
    return {"IsSuccess": True, "data": {"total": total, "fake_users": out}}


@router.post("/fake-users/generate")
def generate_fake_users(city: str = Form(...), target_audience: str = Form(...), number: int = Form(5), db: Session = Depends(get_db), _ = Depends(admin_required)):
    number = int(number)
    if number <= 0 or number > MAX_FAKE_USER_GENERATE:
        raise HTTPException(status_code=400, detail=f"Number must be between 1 and {MAX_FAKE_USER_GENERATE}")
    if city not in ALLOWED_CITY_NAMES:
        raise HTTPException(status_code=400, detail=f"City '{city}' is not allowed")

    created = []
    for _ in range(number):
        name = fake.name()
        local = "".join(ch for ch in name.lower() if (ch.isalpha() or ch == " ")).replace(" ", ".")
        suffix = fake.random_int(min=1, max=9999)
        email = f"{local}{suffix}@fake.betogether.com"
        fu = models.FakeUser(name=name, email=email, city=city, target_audience=target_audience, status="active")
        db.add(fu)
        db.flush()
        created.append({"id": fu.id, "name": fu.name, "email": fu.email, "city": fu.city, "target_audience": fu.target_audience, "status": fu.status, "created_at": fu.created_at})
    db.commit()
    return {"IsSuccess": True, "message": f"Created {len(created)} fake users", "data": {"created": created}}


from fastapi import Request, Body, Form

@router.put("/fake-users/status")
def update_fake_user_status_by_email(
    request: Request,
    email: Optional[str] = Form(None),
    json_body: Optional[dict] = Body(None),
    status: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _ = Depends(admin_required),
):
    """
    Update a fake user's status by email (no numeric id required).
    Accepts:
      - form: email=<email>&status=active|blocked
      - json: {"email": "...", "status": "active"}
    """
    # prefer form values first, then JSON
    e = email or (json_body.get("email") if isinstance(json_body, dict) else None)
    s = status or (json_body.get("status") if isinstance(json_body, dict) else None)

    if not e or not s:
        raise HTTPException(status_code=422, detail="Missing 'email' or 'status' field (form or JSON).")

    s_val = str(s).strip().lower()
    if s_val not in ("active", "blocked"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'blocked'")

    fu = db.query(models.FakeUser).filter(func.lower(models.FakeUser.email) == e.strip().lower()).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Fake user not found")

    fu.status = s_val
    db.commit()
    db.refresh(fu)
    return {"IsSuccess": True, "message": f"Fake user {fu.email} set to {s_val}", "data": {"id": fu.id, "email": fu.email, "status": fu.status}}

# ---------- Fake Users CSV Import / Export ----------
@router.post("/fake-users/import")
def import_fake_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _ = Depends(admin_required),
):
    """
    Robust CSV import with duplicate-email protection:
    - Expects multipart/form-data upload with field name 'file'
    - Skips rows where email already exists (in User or FakeUser) - case-insensitive
    - Also prevents duplicate emails within the same CSV
    - Uses BufferedReader -> TextIOWrapper to avoid 'readable' errors
    - Trims fields, case-insensitive city mapping, rollback on DB-level error, row limit
    """
    MAX_IMPORT_ROWS = 5000

    # ensure pointer at beginning
    try:
        file.file.seek(0)
    except Exception:
        pass

    # Prepare CSV reader (BufferedReader -> TextIOWrapper preferred)
    buffered = None
    text_stream = None
    try:
        buffered = io.BufferedReader(file.file)
        text_stream = io.TextIOWrapper(buffered, encoding="utf-8", errors="replace", newline="")
        reader = csv.DictReader(text_stream)
    except Exception as e:
        # fallback: read into memory
        try:
            file.file.seek(0)
            raw_bytes = file.file.read()
            text = raw_bytes.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            text_stream = None
        except Exception as e2:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded CSV: {str(e)} / {str(e2)}")

    created = []
    skipped = []  # will store {"row": row_count, "reason": "...", "email": email}
    row_count = 0

    # keep track of emails seen in this file (lowercased) to avoid duplicates inside upload
    seen_emails = set()

    try:
        for row in reader:
            row_count += 1
            if row_count > MAX_IMPORT_ROWS:
                raise HTTPException(status_code=400, detail=f"Too many rows in CSV (limit {MAX_IMPORT_ROWS})")

            # normalize inputs
            name = (row.get("name") or row.get("full_name") or fake.name()).strip()
            email_raw = (row.get("email") or "").strip()
            if email_raw:
                email = email_raw
            else:
                safe_local = "".join(ch for ch in name.lower() if (ch.isalpha() or ch.isdigit() or ch == " ")).replace(" ", ".")[:40]
                suffix = fake.random_int(min=1, max=9999)
                email = f"{safe_local}{suffix}@fake.betogether.com"

            # case-insensitive email key
            email_key = email.strip().lower()

            # check duplicates within the file
            if email_key in seen_emails:
                skipped.append({"row": row_count, "email": email, "reason": "duplicate-in-file"})
                continue

            # check existing in DB: FakeUser or User (case-insensitive)
            exists_fake = db.query(models.FakeUser).filter(func.lower(models.FakeUser.email) == email_key).first()
            exists_user = db.query(models.User).filter(func.lower(models.User.email) == email_key).first()
            if exists_fake or exists_user:
                skipped.append({"row": row_count, "email": email, "reason": "email-exists"})
                # mark as seen to avoid repeated DB checks for same file
                seen_emails.add(email_key)
                continue

            # city mapping
            city_raw = (row.get("city") or row.get("city_name") or "Barcelona").strip()
            if city_raw in ALLOWED_CITY_NAMES:
                city = city_raw
            else:
                matched = next((c for c in ALLOWED_CITY_NAMES if c.lower() == city_raw.lower()), None)
                city = matched if matched else city_raw

            target = (row.get("target_audience") or row.get("audience") or "tourists").strip()

            # create object
            fu = models.FakeUser(
                name=name,
                email=email,
                city=city,
                target_audience=target,
                status="active",
            )
            db.add(fu)
            db.flush()  # obtain id
            created.append({"id": fu.id, "name": fu.name, "email": fu.email})

            # mark email as seen to avoid duplicates within this CSV
            seen_emails.add(email_key)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import CSV: {str(e)}")
    finally:
        # close/detach wrappers
        try:
            if 'text_stream' in locals() and text_stream is not None:
                text_stream.detach()
        except Exception:
            pass
        try:
            if buffered is not None:
                buffered.close()
        except Exception:
            pass

    # return created + skipped summary
    return {
        "IsSuccess": True,
        "message": f"Imported {len(created)} fake users, skipped {len(skipped)} rows",
        "data": {"created": created, "skipped": skipped},
    }


@router.get("/fake-users/export")
def export_fake_users(db: Session = Depends(get_db), _ = Depends(admin_required)):
    q = db.query(models.FakeUser).order_by(models.FakeUser.id).all()
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(["id", "name", "email", "city", "target_audience", "status", "created_at"])
    for f in q:
        writer.writerow([f.id, f.name, f.email, f.city, f.target_audience, f.status, f.created_at.isoformat()])
    si.seek(0)
    return StreamingResponse(io.BytesIO(si.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=fake_users.csv"})


# ---------- Settings ----------
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _ = Depends(admin_required)):
    row = db.query(models.Settings).filter(models.Settings.key == "admin_config").first()
    if not row or not row.value:
        defaults = {"revenue_split": {"provider": 80, "seeker": 20, "platform": 0}, "discounts": {"global_discount": 0, "category_wise": False}}
        return {"IsSuccess": True, "data": {"settings": defaults}}
    return {"IsSuccess": True, "data": {"settings": row.value}}


@router.post("/settings")
def update_settings(new_settings: dict, db: Session = Depends(get_db), _ = Depends(admin_required)):
    row = db.query(models.Settings).filter(models.Settings.key == "admin_config").first()
    if not row:
        row = models.Settings(key="admin_config", value=new_settings)
        db.add(row)
    else:
        row.value = new_settings
    db.commit()
    db.refresh(row)
    return {"IsSuccess": True, "message": "Settings updated", "data": {"settings": row.value}}


# ---------- Tag suggestions endpoint for UI ----------
@router.get("/tag-suggestions")
def tag_suggestions(q: str = Query(..., min_length=1), limit: int = Query(12, ge=1, le=MAX_TAGS), _ = Depends(admin_required)):
    """
    Return tag suggestions for a short query `q`. This calls TagInfo over a small
    set of keys and returns pretty/displayable results.
    Response: {"IsSuccess": True, "data": {"suggestions": [{"value": "fast food", "display": "Fast Food"}, ...]}}

    This endpoint can be used by the UI to autocomplete tag input.
    """
    q_norm = q.strip().lower()
    if not q_norm:
        return {"IsSuccess": True, "data": {"suggestions": []}}

    candidate_keys = ["cuisine", "amenity", "shop", "craft", "service"]
    found: List[str] = []
    try:
        for key in candidate_keys:
            values = taginfo_fetch_values_for_key(key, rp=500)
            if not values:
                continue
            for v in values:
                # v is already sanitized & lowercased by taginfo_fetch_values_for_key
                v_norm = normalize_tag_for_storage(v)
                if q_norm in v_norm:
                    found.append(v_norm)
                if len(found) >= limit:
                    break
            if len(found) >= limit:
                break
    except Exception:
        pass

    unique = list(dict.fromkeys(found))[:min(limit, MAX_TAGS)]
    suggestions = [{"value": u, "display": prettify_tag_for_display(u)} for u in unique]
    return {"IsSuccess": True, "data": {"suggestions": suggestions}}

