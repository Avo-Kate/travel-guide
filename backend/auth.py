"""Auth endpoints: register, login, and the current-user lookup.

Routes live under ``/auth``. Clients authenticate by sending the returned JWT
as ``Authorization: Bearer <token>``; ``get_current_user`` is the dependency
that protected endpoints use to resolve the caller.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from db import get_db
from models import User
from security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# auto_error=False so missing/garbage headers fall through to our own 401 with
# a consistent message rather than FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# --------------------------------------------------------------------------- #
# Dependency
# --------------------------------------------------------------------------- #
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from the Bearer token, or raise 401."""
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise invalid

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise invalid

    user = db.get(User, user_id)
    if user is None:
        raise invalid
    return user


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(creds: Credentials, db: Session = Depends(get_db)):
    email = creds.email.lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(email=email, password_hash=hash_password(creds.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_access_token(user.id), user=user)


@router.post("/login", response_model=AuthResponse)
def login(creds: Credentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email.lower()).first()
    if user is None or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return AuthResponse(token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
