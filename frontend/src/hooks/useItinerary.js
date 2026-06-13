import { useCallback, useEffect, useState } from "react";
import { fetchItinerary } from "../utils/api.js";

const STORAGE_KEY = "wandr.itinerary";

// Manages itinerary state: loads/saves to localStorage and fetches from the API.
export function useItinerary() {
  const [itinerary, setItinerary] = useState(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hydrate from localStorage on first mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setItinerary(parsed.stops);
        setCity(parsed.city || "");
      }
    } catch {
      // Ignore corrupt storage.
    }
  }, []);

  const persist = useCallback((stops, cityName) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stops, city: cityName })
    );
  }, []);

  const generate = useCallback(
    async (cityName, days) => {
      setLoading(true);
      setError(null);
      try {
        const stops = await fetchItinerary(cityName, days);
        setItinerary(stops);
        setCity(cityName);
        persist(stops, cityName);
        return stops;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItinerary(null);
    setCity("");
    setError(null);
  }, []);

  return { itinerary, city, loading, error, generate, clear };
}
