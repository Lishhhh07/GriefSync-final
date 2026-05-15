"""Authentication — JWT-based register/login for GriefSync."""

import os
import sys
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
import hashlib

from backend.db import supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72


# --- Models ---

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


# --- Helpers ---

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """Verify JWT and return payload."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get the current authenticated user from JWT."""
    if not credentials:
        # Fallback to demo user for backward compatibility
        return {"user_id": 1, "email": "rahul@demo.in"}
    return verify_token(credentials)


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Dependency that returns just the user_id. Falls back to 1 (demo user) if no token."""
    if not credentials:
        return 1
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except (JWTError, KeyError):
        return 1


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Strict auth dependency — returns 401 if no valid token. Used for chatbot."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Login required to use the chatbot")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# --- Routes ---

@router.post("/register")
async def register(body: RegisterBody):
    """Register a new user."""
    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    password_hash = hash_password(body.password)
    res = supabase.table("users").insert({
        "name": body.name,
        "email": body.email,
        "password_hash": password_hash,
        "checkin_interval_days": 7,
        "last_checkin_at": datetime.utcnow().isoformat(),
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = res.data[0]
    token = create_token(user["id"], user["email"])

    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@router.post("/login")
async def login(body: LoginBody):
    """Login with email + password."""
    res = supabase.table("users").select("*").eq("email", body.email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = res.data[0]
    password_hash = hash_password(body.password)

    stored_hash = user.get("password_hash", "")
    if stored_hash != password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])

    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info from token."""
    user_id = current_user["user_id"]
    res = supabase.table("users").select("id, name, email").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": res.data}
