import { useEffect, useState } from "react";

// Tracks the device's GPS position with watchPosition.
// Returns { position: {lat, lng} | null, error, supported }.
export function useGeolocation(enabled = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!enabled || !supported) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, supported]);

  return { position, error, supported };
}
