import { useCallback, useEffect, useState } from "react";
import { fetchItinerary } from "../utils/api.js";
import {
  createItinerary,
  deleteItinerary,
  getItinerary,
  listItineraries,
} from "../utils/itineraries.js";
import {
  cacheHistory,
  cacheTrip,
  clearOfflineCache,
  readCachedHistory,
  readCachedTrip,
} from "../utils/offline.js";

const STORAGE_KEY = "wandr.itinerary";

// Manages itinerary state and fetches plans from the API. Storage depends on
// auth: signed-in users (a `token` is present) keep a server-side trip history;
// guests fall back to a single most-recent plan in localStorage.
export function useItinerary(token) {
  const [itinerary, setItinerary] = useState(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Re-initialise whenever auth changes. Signing in loads the server history
  // (and drops any guest view); signing out restores the localStorage plan.
  useEffect(() => {
    setError(null);
    if (token) {
      setItinerary(null);
      setCity("");
      // Online: refresh from the server and mirror it for offline use.
      // Offline (fetch rejects): fall back to the last cached history.
      listItineraries(token)
        .then((list) => {
          setHistory(list);
          cacheHistory(list);
        })
        .catch(() => setHistory(readCachedHistory()));
      return;
    }
    // Guest / signed out: forget any cached server trips.
    clearOfflineCache();
    setHistory([]);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      setItinerary(saved?.stops ?? null);
      setCity(saved?.city ?? "");
    } catch {
      // Ignore corrupt storage.
    }
  }, [token]);

  const generate = useCallback(
    async (cityName, days) => {
      setLoading(true);
      setError(null);
      try {
        const stops = await fetchItinerary(cityName, days);
        setItinerary(stops);
        setCity(cityName);
        if (token) {
          const saved = await createItinerary(token, { city: cityName, days, stops });
          cacheTrip(saved);
          setHistory((prev) => {
            const next = [toSummary(saved), ...prev];
            cacheHistory(next);
            return next;
          });
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ stops, city: cityName }));
        }
        return stops;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Load a saved trip from history into the main view.
  const loadTrip = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const trip = await getItinerary(token, id);
        cacheTrip(trip);
        setItinerary(trip.stops);
        setCity(trip.city);
      } catch (err) {
        // Offline: show the cached copy if we have one, else surface the error.
        const cached = readCachedTrip(id);
        if (cached) {
          setItinerary(cached.stops);
          setCity(cached.city);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const removeTrip = useCallback(
    async (id) => {
      try {
        await deleteItinerary(token, id);
        setHistory((prev) => {
          const next = prev.filter((t) => t.id !== id);
          cacheHistory(next);
          return next;
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [token]
  );

  // Clear the current view. For guests this also forgets the stored plan;
  // signed-in users keep their saved trips in history.
  const clear = useCallback(() => {
    if (!token) localStorage.removeItem(STORAGE_KEY);
    setItinerary(null);
    setCity("");
    setError(null);
  }, [token]);

  return { itinerary, city, loading, error, history, generate, loadTrip, removeTrip, clear };
}

function toSummary(trip) {
  return {
    id: trip.id,
    city: trip.city,
    days: trip.days,
    stop_count: trip.stops.length,
    created_at: trip.created_at,
  };
}
