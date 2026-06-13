"""Wandr backend — FastAPI app powering the itinerary planner and tour-guide narration.

Two endpoints:
  POST /itinerary  -> Claude + web search builds a structured, geocoded itinerary.
  POST /narration  -> Claude writes a short spoken narration for a single stop.
"""

import json
import os
import re

import anthropic
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Claude Haiku 4.5 — cheapest/fastest tier, ample for itinerary synthesis and
# narration in this POC ($1/$5 per MTok vs Sonnet's $3/$15).
MODEL = "claude-haiku-4-5"

# Server-side web search tool. `allowed_callers=["direct"]` disables the
# programmatic/dynamic-filtering path, which Haiku 4.5 does not support — the
# model calls the tool directly instead.
WEB_SEARCH_TOOL = {
    "type": "web_search_20260209",
    "name": "web_search",
    "allowed_callers": ["direct"],
}

ITINERARY_SYSTEM_PROMPT = """You are a travel itinerary planner. When given a city and number of days, use web search to find popular, well-reviewed itineraries for that city. Synthesise the best stops into a structured JSON response.

Return ONLY a valid JSON array. No preamble, no explanation, no markdown. Each item in the array must have these exact fields:
- day: integer (which day of the trip, starting from 1)
- order: integer (order within the day, starting from 1)
- name: string (exact place name, specific enough to geocode)
- description: string (2-3 sentences about why this stop is worth visiting)
- duration_minutes: integer (recommended time to spend here)
- category: string (one of: "landmark", "museum", "park", "food", "neighbourhood", "viewpoint", "other")

Order stops geographically within each day to minimise walking. Be specific with place names — use "Musée d'Orsay" not "a museum"."""

NARRATION_SYSTEM_PROMPT = """You are a charismatic, knowledgeable tour guide. When given a location name and city, generate 2-3 sentences of audio narration for a visitor who has just arrived there.

Rules:
- Share one specific, true historical fact that most people do not know
- Write in a warm, conversational tone — like you are speaking, not writing
- End with something that makes the listener want to look around or notice something specific
- Do not start with "Welcome to" or "You are now at"
- Return only the narration text, nothing else"""

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

app = FastAPI(title="Wandr API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Request/response models
# --------------------------------------------------------------------------- #
class ItineraryRequest(BaseModel):
    city: str = Field(..., min_length=1)
    days: int = Field(..., ge=1, le=14)


class NarrationRequest(BaseModel):
    stop_name: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)


class NarrationResponse(BaseModel):
    narration: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _collect_text(content) -> str:
    """Join all text blocks from a Claude response into a single string."""
    return "".join(block.text for block in content if block.type == "text")


def _extract_json_array(text: str):
    """Pull the first valid top-level JSON array out of a text blob.

    Claude is asked to return only a JSON array, but web-search responses can
    wrap it in stray prose or a markdown fence, so we locate the array span and
    parse it defensively.
    """
    # Strip markdown code fences if present.
    fenced = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None

    if candidate is None:
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1 or end < start:
            raise ValueError("No JSON array found in model response")
        candidate = text[start : end + 1]

    return json.loads(candidate)


async def _generate_itinerary(city: str, days: int):
    """Run the Claude + web-search loop and return the parsed itinerary list."""
    messages = [
        {
            "role": "user",
            "content": f"Plan a {days}-day itinerary for {city}.",
        }
    ]

    # Server-side tools run an internal loop that can pause with `pause_turn`.
    # Re-send the accumulated turn until Claude finishes (or we hit a safety cap).
    response = None
    for _ in range(5):
        response = await client.messages.create(
            model=MODEL,
            max_tokens=8000,
            system=ITINERARY_SYSTEM_PROMPT,
            messages=messages,
            tools=[WEB_SEARCH_TOOL],
        )
        if response.stop_reason != "pause_turn":
            break
        messages.append({"role": "assistant", "content": response.content})

    text = _collect_text(response.content)
    try:
        return _extract_json_array(text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse itinerary from model: {exc}",
        )


async def _geocode(http: httpx.AsyncClient, place: str, city: str):
    """Return (lat, lng) for a place name, or (None, None) if not found."""
    if not GOOGLE_MAPS_API_KEY:
        return None, None
    try:
        resp = await http.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": f"{place}, {city}", "key": GOOGLE_MAPS_API_KEY},
        )
        data = resp.json()
    except (httpx.HTTPError, json.JSONDecodeError):
        return None, None

    if data.get("status") == "OK" and data.get("results"):
        loc = data["results"][0]["geometry"]["location"]
        return loc["lat"], loc["lng"]
    return None, None


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.get("/")
async def root():
    return {"status": "ok", "service": "wandr-api"}


@app.post("/itinerary")
async def itinerary(req: ItineraryRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not set")

    stops = await _generate_itinerary(req.city, req.days)

    # Geocode each stop and attach lat/lng.
    async with httpx.AsyncClient(timeout=15.0) as http:
        for stop in stops:
            lat, lng = await _geocode(http, stop.get("name", ""), req.city)
            stop["lat"] = lat
            stop["lng"] = lng

    return stops


@app.post("/narration", response_model=NarrationResponse)
async def narration(req: NarrationRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not set")

    response = await client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=NARRATION_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Location: {req.stop_name}\nCity: {req.city}",
            }
        ],
    )

    return NarrationResponse(narration=_collect_text(response.content).strip())
