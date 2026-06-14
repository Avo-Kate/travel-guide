# Wandr — Your AI Travel Guide

Wandr turns a city and a number of days into a structured, mapped, geocoded itinerary — and then walks the trip with you, narrating each stop aloud as you arrive.

## What it does

**Plan Mode** — Enter a city and trip length. The backend uses Claude with live web search to synthesise a well-reviewed, day-by-day itinerary, geocodes each stop with Google, and renders it as a readable list alongside a Google Map with numbered pins.

**Guide Mode** — Open Wandr on your phone while travelling. It tracks your GPS location, and when you come within ~100 m of a stop it asks Claude for a short, fun historical narration and reads it aloud through your browser's built-in text-to-speech. Visited stops are checked off on the map and list.

## Tech stack

- **Frontend:** React + Vite (plain JavaScript, no CSS framework)
- **Backend:** FastAPI (Python)
- **AI:** Anthropic Claude API (`claude-haiku-4-5`) with the built-in `web_search` tool for itinerary generation
- **Maps:** Google Maps JavaScript API (`@googlemaps/js-api-loader`) for map display and pins
- **Geocoding:** Google Geocoding API (place name → coordinates)
- **Speech:** Browser Web Speech API (text-to-speech — no library, no cost)
- **Storage:** Browser `localStorage` (no database)

## Getting started

You'll run two processes: the FastAPI backend and the Vite dev server.

### 1. Backend

Requires **Python 3.9+** (the `anthropic` SDK won't install on 3.7/3.8). If your
`python3` is older, use a versioned interpreter explicitly (e.g. `python3.10`).

```bash
cd backend
python3.10 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                # then fill in your keys
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`.

### 2. Frontend

Requires **Node 18+** (Vite 6 won't run on older Node).

```bash
cd frontend
npm install
cp .env.example .env                                # then add your Google Maps key
npm run dev
```

The app runs at `http://localhost:5173`.

Open the app, enter `Paris` / `3` days, and submit. Generation takes ~10–20 seconds (Claude is searching the web). The itinerary then renders as a list and on the map.

## Testing

The backend has an offline test suite (helpers + both endpoints). The tests
**stub out the Anthropic client and Google geocoding**, so they need no real API
keys and make no network calls.

If you haven't set up the backend yet, create and activate the virtualenv first
(see [Getting started → Backend](#1-backend)). Then, from `backend/` with the
venv active, install `pytest` and run it:

```bash
cd backend
source .venv/bin/activate   # if not already active
pip install pytest
pytest
```

The suite runs in well under a second.

## Environment variables

### Backend (`backend/.env`)

| Variable              | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Anthropic API key — powers itinerary generation and narration.         |
| `GOOGLE_MAPS_API_KEY` | Google API key with the **Geocoding API** enabled (place → lat/lng).   |

### Frontend (`frontend/.env`)

| Variable                    | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `VITE_API_URL`              | Backend base URL. Defaults to `http://localhost:8000`.                       |
| `VITE_GOOGLE_MAPS_API_KEY`  | Google API key with the **Maps JavaScript API** enabled (map display).       |

> The two Google keys can be the same key as long as both the Maps JavaScript API and the Geocoding API are enabled for it.

## Project structure

```
/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # App shell + Plan/Guide mode toggle
│       ├── index.css                 # Global styles + responsive grid
│       ├── components/
│       │   ├── CityForm.jsx          # City + days input form
│       │   ├── ItineraryList.jsx     # List view of stops, grouped by day
│       │   ├── MapView.jsx           # Google Map with numbered stop pins
│       │   └── GuideMode.jsx         # GPS tracking + narration UI
│       ├── hooks/
│       │   ├── useItinerary.js       # Fetch + persist itinerary (localStorage)
│       │   └── useGeolocation.js     # GPS tracking via watchPosition
│       └── utils/
│           ├── api.js                # API calls to the backend
│           └── distance.js           # Haversine distance (metres)
├── backend/
│   ├── main.py                       # FastAPI app: /itinerary + /narration
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_main.py              # offline tests for helpers + endpoints
│   └── .env.example                  # API key placeholders
├── .gitignore
└── README.md
```

## API

- `POST /itinerary` — body `{ "city": "Paris", "days": 3 }` → array of stops, each with `day`, `order`, `name`, `description`, `duration_minutes`, `category`, `lat`, `lng`.
- `POST /narration` — body `{ "stop_name": "Eiffel Tower", "city": "Paris" }` → `{ "narration": "..." }`.

## Build Checklist

### POC — Phase 1: Itinerary Planner
- [x] Project scaffold (React + Vite + FastAPI)
- [x] README and docs
- [x] City + duration input form
- [x] FastAPI /itinerary endpoint
- [x] Claude itinerary generation with web search
- [x] Itinerary list display
- [x] Google Maps integration with stop pins
- [x] Save itinerary to localStorage

### POC — Phase 2: Guide Mode
- [ ] GPS location tracking
- [ ] Proximity detection (within 100m of a stop)
- [ ] FastAPI /narration endpoint
- [ ] Claude narration generation
- [ ] Audio playback via Web Speech API
- [ ] Guide Mode UI (toggle from Plan Mode)
- [ ] Mark stops as visited on map

### POC — Polish
- [ ] Error handling and loading states
- [ ] Mobile UI polish

### V2 (post-POC)
- [ ] User accounts and authentication
- [ ] Trip history
- [ ] Offline mode
- [ ] Itinerary editing (add/remove/reorder stops)
- [ ] Multi-language narration
```
