const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// POST /itinerary -> returns an array of stops (each with lat/lng).
export async function fetchItinerary(city, days) {
  const res = await post("/itinerary", { city, days }, "Itinerary request");
  return res.json();
}

// POST /narration -> returns the narration string for a single stop.
export async function fetchNarration(stopName, city) {
  const res = await post(
    "/narration",
    { stop_name: stopName, city },
    "Narration request"
  );
  const data = await res.json();
  return data.narration;
}

// Shared POST helper: sends JSON, turns non-2xx responses and network failures
// into Errors with a human-readable message. `label` names the request for
// fallback messages (e.g. "Itinerary request failed").
async function post(path, body, label) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network errors (server down, offline, CORS).
    throw new Error(
      "Couldn't reach the server. Is the backend running, and are you online?"
    );
  }

  if (!res.ok) {
    const detail = await safeError(res);
    throw new Error(detail || `${label} failed (${res.status})`);
  }

  return res;
}

async function safeError(res) {
  try {
    const data = await res.json();
    return data.detail;
  } catch {
    return null;
  }
}
