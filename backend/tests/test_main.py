"""Tests for the Wandr backend.

These run fully offline: the Anthropic client and the geocoding HTTP calls are
replaced with fakes, so no real API keys or network access are needed. Async
helpers are driven directly with ``asyncio.run``; the endpoints are exercised
through FastAPI's ``TestClient``.
"""

import asyncio
import json
import os

# Set dummy keys before importing `main` so it instantiates cleanly and the tests
# never depend on (or call) the real Anthropic/Google APIs. main's load_dotenv()
# uses override=False, so these win over anything in backend/.env.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-google-key")
# Keep the DB in memory so importing `main` (which runs init_db) never writes a
# wandr.db file during the test run.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402  (must follow the env setup above)


# --------------------------------------------------------------------------- #
# Fakes
# --------------------------------------------------------------------------- #
class FakeTextBlock:
    type = "text"

    def __init__(self, text):
        self.text = text


class FakeNonTextBlock:
    type = "tool_use"

    def __init__(self):
        self.text = "should-be-ignored"


class FakeResponse:
    def __init__(self, content, stop_reason="end_turn"):
        self.content = content
        self.stop_reason = stop_reason


class FakeMessages:
    """Stands in for client.messages; returns queued responses in order."""

    def __init__(self, responses):
        self._queue = list(responses)
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        # Repeat the last response if the loop asks for more than we queued.
        return self._queue.pop(0) if len(self._queue) > 1 else self._queue[0]


class FakeClient:
    def __init__(self, responses):
        self.messages = FakeMessages(responses)


class FakeHttpResponse:
    def __init__(self, data):
        self._data = data

    def json(self):
        return self._data


class FakeHttp:
    def __init__(self, data=None, exc=None):
        self._data = data
        self._exc = exc

    async def get(self, url, params=None):
        if self._exc is not None:
            raise self._exc
        return FakeHttpResponse(self._data)


@pytest.fixture
def client():
    return TestClient(main.app)


# --------------------------------------------------------------------------- #
# _collect_text
# --------------------------------------------------------------------------- #
def test_collect_text_joins_only_text_blocks():
    content = [FakeTextBlock("Hello "), FakeNonTextBlock(), FakeTextBlock("world")]
    assert main._collect_text(content) == "Hello world"


def test_collect_text_empty():
    assert main._collect_text([]) == ""


# --------------------------------------------------------------------------- #
# _extract_json_array
# --------------------------------------------------------------------------- #
def test_extract_json_array_bare():
    text = '[{"name": "Colosseum"}]'
    assert main._extract_json_array(text) == [{"name": "Colosseum"}]


def test_extract_json_array_fenced():
    text = 'Here you go:\n```json\n[{"name": "Pantheon"}]\n```\nEnjoy!'
    assert main._extract_json_array(text) == [{"name": "Pantheon"}]


def test_extract_json_array_surrounded_by_prose():
    text = 'Sure! [{"order": 1}, {"order": 2}] Hope that helps.'
    assert main._extract_json_array(text) == [{"order": 1}, {"order": 2}]


def test_extract_json_array_no_array_raises():
    with pytest.raises(ValueError):
        main._extract_json_array("There is no array here.")


def test_extract_json_array_invalid_json_raises():
    with pytest.raises(json.JSONDecodeError):
        main._extract_json_array("[not, valid, json]")


# --------------------------------------------------------------------------- #
# _geocode
# --------------------------------------------------------------------------- #
def test_geocode_success():
    data = {"status": "OK", "results": [{"geometry": {"location": {"lat": 41.9, "lng": 12.5}}}]}
    lat, lng = asyncio.run(main._geocode(FakeHttp(data=data), "Colosseum", "Rome"))
    assert (lat, lng) == (41.9, 12.5)


def test_geocode_zero_results():
    data = {"status": "ZERO_RESULTS", "results": []}
    assert asyncio.run(main._geocode(FakeHttp(data=data), "Nowhere", "Rome")) == (None, None)


def test_geocode_http_error_swallowed():
    import httpx

    http = FakeHttp(exc=httpx.HTTPError("boom"))
    assert asyncio.run(main._geocode(http, "Colosseum", "Rome")) == (None, None)


def test_geocode_no_api_key(monkeypatch):
    monkeypatch.setattr(main, "GOOGLE_MAPS_API_KEY", None)
    assert asyncio.run(main._geocode(FakeHttp(data={}), "Colosseum", "Rome")) == (None, None)


# --------------------------------------------------------------------------- #
# GET /
# --------------------------------------------------------------------------- #
def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "wandr-api"}


# --------------------------------------------------------------------------- #
# POST /itinerary
# --------------------------------------------------------------------------- #
def _itinerary_json():
    return json.dumps(
        [
            {
                "day": 1,
                "order": 1,
                "name": "Colosseum",
                "description": "An ancient amphitheatre.",
                "duration_minutes": 90,
                "category": "landmark",
            }
        ]
    )


def test_itinerary_happy_path(client, monkeypatch):
    monkeypatch.setattr(main, "client", FakeClient([FakeResponse([FakeTextBlock(_itinerary_json())])]))

    async def fake_geocode(http, place, city):
        return 41.89, 12.49

    monkeypatch.setattr(main, "_geocode", fake_geocode)

    resp = client.post("/itinerary", json={"city": "Rome", "days": 2})
    assert resp.status_code == 200
    stops = resp.json()
    assert len(stops) == 1
    assert stops[0]["name"] == "Colosseum"
    assert stops[0]["lat"] == 41.89 and stops[0]["lng"] == 12.49


def test_itinerary_follows_pause_turn_loop(client, monkeypatch):
    fake = FakeClient(
        [
            FakeResponse([FakeTextBlock("")], stop_reason="pause_turn"),
            FakeResponse([FakeTextBlock(_itinerary_json())], stop_reason="end_turn"),
        ]
    )
    monkeypatch.setattr(main, "client", fake)

    async def fake_geocode(http, place, city):
        return None, None

    monkeypatch.setattr(main, "_geocode", fake_geocode)

    resp = client.post("/itinerary", json={"city": "Rome", "days": 1})
    assert resp.status_code == 200
    # Both the paused turn and the resumed turn should have hit the API.
    assert len(fake.messages.calls) == 2


def test_itinerary_unparseable_returns_502(client, monkeypatch):
    monkeypatch.setattr(
        main, "client", FakeClient([FakeResponse([FakeTextBlock("Sorry, no JSON today.")])])
    )
    resp = client.post("/itinerary", json={"city": "Rome", "days": 2})
    assert resp.status_code == 502


def test_itinerary_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.setattr(main, "ANTHROPIC_API_KEY", None)
    resp = client.post("/itinerary", json={"city": "Rome", "days": 2})
    assert resp.status_code == 500


@pytest.mark.parametrize(
    "payload",
    [
        {"city": "Rome", "days": 0},
        {"city": "Rome", "days": 99},
        {"city": "", "days": 2},
        {"days": 2},
        {"city": "Rome"},
    ],
)
def test_itinerary_validation_errors(client, payload):
    assert client.post("/itinerary", json=payload).status_code == 422


# --------------------------------------------------------------------------- #
# POST /narration
# --------------------------------------------------------------------------- #
def test_narration_happy_path(client, monkeypatch):
    narration_text = "  Standing here, few realise this spot was once a marsh. Look up. "
    monkeypatch.setattr(
        main, "client", FakeClient([FakeResponse([FakeTextBlock(narration_text)])])
    )
    resp = client.post("/narration", json={"stop_name": "Pantheon", "city": "Rome"})
    assert resp.status_code == 200
    assert resp.json() == {"narration": narration_text.strip()}


def test_narration_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.setattr(main, "ANTHROPIC_API_KEY", None)
    resp = client.post("/narration", json={"stop_name": "Pantheon", "city": "Rome"})
    assert resp.status_code == 500


@pytest.mark.parametrize(
    "payload",
    [{"stop_name": "", "city": "Rome"}, {"stop_name": "Pantheon", "city": ""}, {"city": "Rome"}],
)
def test_narration_validation_errors(client, payload):
    assert client.post("/narration", json=payload).status_code == 422
