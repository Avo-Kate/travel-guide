"""Password hashing and JWT helpers for auth.

Passwords are hashed with bcrypt; sessions are stateless JWTs signed with
``JWT_SECRET`` (HS256). Keep this module free of FastAPI imports so it stays
trivially unit-testable.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# bcrypt only hashes the first 72 bytes; reject longer inputs rather than
# silently truncating (which would make a too-long password "match" a prefix).
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_encode(password), password_hash.encode())
    except ValueError:
        return False


def _encode(password: str) -> bytes:
    data = password.encode("utf-8")
    if len(data) > _BCRYPT_MAX_BYTES:
        raise ValueError("Password must be at most 72 bytes")
    return data


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Return the user id encoded in a valid token, or None if it's invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
