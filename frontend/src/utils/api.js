const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// POST /itinerary -> returns an array of stops (each with lat/lng).
export async function fetchItinerary(city, days) {
  const res = await fetch(`${BASE_URL}/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, days }),
  });

  if (!res.ok) {
    const detail = await safeError(res);
    throw new Error(detail || `Itinerary request failed (${res.status})`);
  }

  return res.json();
}

// POST /narration -> returns the narration string for a single stop.
export async function fetchNarration(stopName, city) {
  const res = await fetch(`${BASE_URL}/narration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stop_name: stopName, city }),
  });

  if (!res.ok) {
    const detail = await safeError(res);
    throw new Error(detail || `Narration request failed (${res.status})`);
  }

  const data = await res.json();
  return data.narration;
}

async function safeError(res) {
  try {
    const data = await res.json();
    return data.detail;
  } catch {
    return null;
  }
}
