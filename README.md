# Wandr — Your AI Travel Guide

[![CI](https://github.com/Avo-Kate/travel-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/Avo-Kate/travel-guide/actions/workflows/ci.yml)

Wandr turns a city and a number of days into a structured, mapped, geocoded itinerary — and narrates any stop aloud on demand, all on a single page.

## What it does

Enter a city and trip length. The backend uses Claude with live web search to synthesise a well-reviewed, day-by-day itinerary, geocodes each stop with Google, and renders it as a readable list alongside a Google Map with numbered pins.

Each stop has a **Listen** button: tap it and Claude writes a short, fun historical narration that's read aloud through your browser's built-in text-to-speech. Stops you've listened to are checked off and muted on the map.

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

Both halves have fast, offline test suites — no API keys, no network, no running
the app or a browser.

### Backend

Helpers + both endpoints, with the Anthropic client and Google geocoding
**stubbed out**. If you haven't set up the backend yet, create and activate the
virtualenv first (see [Getting started → Backend](#1-backend)). Then, from
`backend/` with the venv active, install `pytest` and run it:

```bash
cd backend
source .venv/bin/activate   # if not already active
pip install pytest
python -m pytest
```

### Frontend

The browser-free logic — filtering stops down to those that geocoded, which the
map and list both rely on — is extracted into a pure function in `src/utils/`
and covered by [Vitest](https://vitest.dev):

```bash
cd frontend
npm install        # first time only — adds vitest
npm test           # or `npm run test:watch`
```

Both suites run in well under a second.

### Continuous integration

Every push to `main` (or a `phase-*` branch) and every pull request runs both
suites on GitHub Actions — backend `pytest` and frontend `vitest` + a production
`vite build` — via [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The CI
badge above reflects the latest run on `main`.

## Releases

Versions are cut with annotated git tags. Pushing a `v*` tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which publishes
a GitHub Release with auto-generated notes:

```bash
git tag -a v0.3.0 -m "Phase 3: polish"
git push origin v0.3.0
```

Tags follow `vMAJOR.MINOR.PATCH` (the POC tracks the phases: `v0.1.0` Phase 1,
`v0.2.0` Phase 2, `v0.3.0` Phase 3 / polish).

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
│       ├── App.jsx                   # Single-page shell (form + list + map)
│       ├── index.css                 # Global styles + responsive grid
│       ├── components/
│       │   ├── CityForm.jsx          # City + days input form
│       │   ├── ItineraryList.jsx     # List of stops (grouped by day) + Listen
│       │   └── MapView.jsx           # Google Map with numbered stop pins
│       ├── hooks/
│       │   ├── useItinerary.js       # Fetch + persist itinerary (localStorage)
│       │   └── useNarration.js       # Fetch narration + Web Speech playback
│       └── utils/
│           ├── api.js                # API calls to the backend
│           ├── stops.js              # Geocoded-stop filtering (pure)
│           └── stops.test.js         # Vitest: locatedStops
├── backend/
│   ├── main.py                       # FastAPI app: /itinerary + /narration
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_main.py              # offline tests for helpers + endpoints
│   └── .env.example                  # API key placeholders
├── .github/
│   └── workflows/
│       ├── ci.yml                    # pytest + vitest + build on push/PR
│       └── release.yml               # GitHub Release on v* tag push
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

### POC — Phase 2: Narration
- [x] FastAPI /narration endpoint
- [x] Claude narration generation
- [x] Per-stop Listen button on the itinerary
- [x] Audio playback via Web Speech API
- [x] Mark listened stops as visited on map

### POC — Phase 3: Polish
- [x] Error handling and loading states (friendly network errors, loading skeleton)
- [x] Mobile UI polish
- [x] Accessibility touch-ups (alert/status roles, button aria-labels)
- [x] Continuous integration (GitHub Actions: pytest + vitest + build)
- [x] Release tagging (GitHub Release on `v*` tag)

### V2 (post-POC)
- [ ] User accounts and authentication
- [ ] Trip history
- [ ] Offline mode
- [ ] Itinerary editing (add/remove/reorder stops)
- [ ] Multi-language narration
```
