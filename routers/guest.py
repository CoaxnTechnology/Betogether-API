from fastapi import APIRouter
from schemas import GuestTokenSchema
from utils.jwt_handler import create_guest_token

router = APIRouter(tags=["Guest"])

@router.post("/guest", response_model=GuestTokenSchema)
def guest_login():
    guest_token = create_guest_token()
    return {
        "guest_token": guest_token,
        "token_type": "bearer"
    }
