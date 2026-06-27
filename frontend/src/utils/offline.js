// Local mirror of a signed-in user's server trips, so trips they've already
// loaded stay readable while offline. (Guests keep their latest plan under
// `wandr.itinerary` in useItinerary; this only covers the server history.)
// Everything is best-effort: storage can be full or unavailable, so reads fall
// back to empty/null rather than throwing.

const HISTORY_KEY = "wandr.offline.history";
const TRIP_PREFIX = "wandr.offline.trip.";

// Cache the trip-summary list shown in TripHistory.
export function cacheHistory(summaries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(summaries));
  } catch {
    // Ignore quota / unavailable storage.
  }
}

export function readCachedHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

// Cache a full trip (with stops) keyed by its server id.
export function cacheTrip(trip) {
  try {
    localStorage.setItem(TRIP_PREFIX + trip.id, JSON.stringify(trip));
  } catch {
    // Ignore quota / unavailable storage.
  }
}

export function readCachedTrip(id) {
  try {
    return JSON.parse(localStorage.getItem(TRIP_PREFIX + id) || "null");
  } catch {
    return null;
  }
}

// Drop every cached trip — called on sign-out so one user's trips don't linger
// in the browser for the next.
export function clearOfflineCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === HISTORY_KEY || key.startsWith(TRIP_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore unavailable storage.
  }
}
