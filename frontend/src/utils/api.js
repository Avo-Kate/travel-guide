const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// POST /itinerary -> returns an array of stops (each with lat/lng).
export async function fetchItinerary(city, days) {
  return request("/itinerary", { body: { city, days }, label: "Itinerary request" });
}

// POST /narration -> returns the narration string for a single stop.
export async function fetchNarration(stopName, city) {
  const data = await request("/narration", {
    body: { stop_name: stopName, city },
    label: "Narration request",
  });
  return data.narration;
}

// Shared request helper: sends/receives JSON, attaches a Bearer token when
// given, and turns non-2xx responses and network failures into Errors with a
// human-readable message. `label` names the request for fallback messages.
export async function request(path, { method = "POST", body, token, label = "Request" } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects on network errors (server down, offline, CORS).
    throw new Error(
      "Couldn't reach the server. Is the backend running, and are you online?"
    );
  }

  if (!res.ok) {
    const detail = await safeError(res);
    const err = new Error(detail || `${label} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  // 204 / empty bodies parse to null rather than throwing.
  return res.status === 204 ? null : res.json();
}

async function safeError(res) {
  try {
    const data = await res.json();
    return data.detail;
  } catch {
    return null;
  }
}
