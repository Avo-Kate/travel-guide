import { request } from "./api.js";

// Server-side trip history for signed-in users. Every call carries the user's
// Bearer token; the backend scopes each operation to that user.

// POST /itineraries -> the saved trip (with stops).
export function createItinerary(token, { city, days, stops }) {
  return request("/itineraries", { body: { city, days, stops }, token, label: "Save trip" });
}

// GET /itineraries -> array of summaries (id, city, days, stop_count, created_at).
export function listItineraries(token) {
  return request("/itineraries", { method: "GET", token, label: "Trip history" });
}

// GET /itineraries/:id -> a single saved trip with its stops.
export function getItinerary(token, id) {
  return request(`/itineraries/${id}`, { method: "GET", token, label: "Load trip" });
}

// DELETE /itineraries/:id -> 204.
export function deleteItinerary(token, id) {
  return request(`/itineraries/${id}`, { method: "DELETE", token, label: "Delete trip" });
}
