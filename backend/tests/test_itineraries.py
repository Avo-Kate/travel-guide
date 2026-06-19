"""Tests for the trip-history endpoints.

Fully offline, reusing the per-test in-memory SQLite wiring from the auth
suite: each test gets a fresh database via FastAPI's dependency override, so
saved trips never leak between tests or touch the real ``wandr.db``.
"""

import os

os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-google-key")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import main  # noqa: E402
from db import Base, get_db  # noqa: E402


@pytest.fixture
def client():
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


STOPS = [
    {
        "day": 1,
        "order": 1,
        "name": "Colosseum",
        "description": "Ancient amphitheatre.",
        "duration_minutes": 90,
        "category": "landmark",
        "lat": 41.8902,
        "lng": 12.4922,
    },
    {
        "day": 1,
        "order": 2,
        "name": "Roman Forum",
        "description": "The civic heart of ancient Rome.",
        "duration_minutes": 60,
        "category": "landmark",
        "lat": None,
        "lng": None,
    },
]
TRIP = {"city": "Rome", "days": 2, "stops": STOPS}


def _auth(client, email="traveller@example.com"):
    """Register a user and return an Authorization header for them."""
    token = client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# Auth is required
# --------------------------------------------------------------------------- #
def test_endpoints_require_auth(client):
    assert client.get("/itineraries").status_code == 401
    assert client.post("/itineraries", json=TRIP).status_code == 401


# --------------------------------------------------------------------------- #
# Create + list
# --------------------------------------------------------------------------- #
def test_create_returns_full_itinerary(client):
    headers = _auth(client)
    resp = client.post("/itineraries", json=TRIP, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"]
    assert body["city"] == "Rome"
    assert body["stop_count"] == 2
    assert body["stops"][0]["name"] == "Colosseum"


def test_list_returns_summaries_newest_first(client):
    headers = _auth(client)
    client.post("/itineraries", json={**TRIP, "city": "Rome"}, headers=headers)
    client.post("/itineraries", json={**TRIP, "city": "Paris"}, headers=headers)

    resp = client.get("/itineraries", headers=headers)
    assert resp.status_code == 200
    trips = resp.json()
    assert [t["city"] for t in trips] == ["Paris", "Rome"]
    # Summaries omit the (potentially large) stops payload.
    assert "stops" not in trips[0]
    assert trips[0]["stop_count"] == 2


def test_create_validation_error(client):
    headers = _auth(client)
    # Empty stops list is rejected.
    resp = client.post("/itineraries", json={**TRIP, "stops": []}, headers=headers)
    assert resp.status_code == 422


# --------------------------------------------------------------------------- #
# Fetch + delete
# --------------------------------------------------------------------------- #
def test_get_single_itinerary(client):
    headers = _auth(client)
    trip_id = client.post("/itineraries", json=TRIP, headers=headers).json()["id"]
    resp = client.get(f"/itineraries/{trip_id}", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["stops"]) == 2


def test_delete_itinerary(client):
    headers = _auth(client)
    trip_id = client.post("/itineraries", json=TRIP, headers=headers).json()["id"]
    assert client.delete(f"/itineraries/{trip_id}", headers=headers).status_code == 204
    assert client.get(f"/itineraries/{trip_id}", headers=headers).status_code == 404


def test_missing_itinerary_is_404(client):
    headers = _auth(client)
    assert client.get("/itineraries/999", headers=headers).status_code == 404
    assert client.delete("/itineraries/999", headers=headers).status_code == 404


# --------------------------------------------------------------------------- #
# Ownership isolation
# --------------------------------------------------------------------------- #
def test_users_cannot_access_each_others_trips(client):
    alice = _auth(client, "alice@example.com")
    bob = _auth(client, "bob@example.com")

    trip_id = client.post("/itineraries", json=TRIP, headers=alice).json()["id"]

    # Bob can't see, fetch, or delete Alice's trip.
    assert client.get("/itineraries", headers=bob).json() == []
    assert client.get(f"/itineraries/{trip_id}", headers=bob).status_code == 404
    assert client.delete(f"/itineraries/{trip_id}", headers=bob).status_code == 404
    # And Alice's trip is untouched.
    assert client.get(f"/itineraries/{trip_id}", headers=alice).status_code == 200
