"""Tests for the auth endpoints and helpers.

Fully offline: a fresh in-memory SQLite database is wired in per test via
FastAPI's dependency override, so registration/login state never leaks between
tests or touches the real ``wandr.db``.
"""

import os

os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-google-key")
os.environ.setdefault("JWT_SECRET", "test-secret")
# Default engine stays in memory; each test wires its own isolated DB below.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import main  # noqa: E402
from db import Base, get_db  # noqa: E402
import security  # noqa: E402


@pytest.fixture
def client():
    # StaticPool keeps the single in-memory connection alive across the request
    # threads, so the schema the fixture creates is the one the app queries.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


CREDS = {"email": "Traveller@Example.com", "password": "hunter2hunter"}


# --------------------------------------------------------------------------- #
# Password + token helpers
# --------------------------------------------------------------------------- #
def test_hash_and_verify_password():
    h = security.hash_password("correct horse battery")
    assert h != "correct horse battery"
    assert security.verify_password("correct horse battery", h)
    assert not security.verify_password("wrong", h)


def test_password_too_long_rejected():
    with pytest.raises(ValueError):
        security.hash_password("x" * 73)


def test_token_round_trip():
    token = security.create_access_token(42)
    assert security.decode_access_token(token) == 42


def test_decode_rejects_garbage():
    assert security.decode_access_token("not-a-token") is None


# --------------------------------------------------------------------------- #
# Register
# --------------------------------------------------------------------------- #
def test_register_returns_token_and_user(client):
    resp = client.post("/auth/register", json=CREDS)
    assert resp.status_code == 201
    body = resp.json()
    assert body["token"]
    # Email is normalised to lowercase and the hash is never exposed.
    assert body["user"]["email"] == "traveller@example.com"
    assert "password_hash" not in body["user"]


def test_register_duplicate_email_conflicts(client):
    client.post("/auth/register", json=CREDS)
    resp = client.post("/auth/register", json={**CREDS, "password": "different1"})
    assert resp.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "password": "longenough1"},
        {"email": "a@b.com", "password": "short"},
        {"password": "longenough1"},
        {"email": "a@b.com"},
    ],
)
def test_register_validation_errors(client, payload):
    assert client.post("/auth/register", json=payload).status_code == 422


# --------------------------------------------------------------------------- #
# Login
# --------------------------------------------------------------------------- #
def test_login_success(client):
    client.post("/auth/register", json=CREDS)
    resp = client.post("/auth/login", json=CREDS)
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_login_wrong_password(client):
    client.post("/auth/register", json=CREDS)
    resp = client.post("/auth/login", json={**CREDS, "password": "wrongpassword"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/auth/login", json=CREDS)
    assert resp.status_code == 401


# --------------------------------------------------------------------------- #
# /auth/me
# --------------------------------------------------------------------------- #
def test_me_with_valid_token(client):
    token = client.post("/auth/register", json=CREDS).json()["token"]
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "traveller@example.com"


def test_me_without_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_invalid_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
