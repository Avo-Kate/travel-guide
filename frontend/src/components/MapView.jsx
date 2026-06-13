import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Renders a Google Map with a numbered pin for each stop. Clicking a pin opens
// an info window with the stop name and description. `visited` is an optional
// Set of stop names that should render in a muted colour.
export default function MapView({ stops, visited }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);
  const infoWindow = useRef(null);
  const [error, setError] = useState(null);

  // Load the Maps JS API once.
  useEffect(() => {
    if (!API_KEY) {
      setError("Set VITE_GOOGLE_MAPS_API_KEY in frontend/.env to enable the map.");
      return;
    }

    let cancelled = false;
    const loader = new Loader({ apiKey: API_KEY, version: "weekly" });

    loader
      .importLibrary("maps")
      .then(({ Map, InfoWindow }) => {
        if (cancelled || !mapRef.current) return;
        mapObj.current = new Map(mapRef.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 12,
          mapId: "WANDR_MAP",
        });
        infoWindow.current = new InfoWindow();
      })
      .catch((err) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // (Re)draw markers whenever the stops or visited set change.
  useEffect(() => {
    if (!mapObj.current || !stops) return;
    const google = window.google;
    if (!google) return;

    // Clear previous markers.
    markers.current.forEach((m) => (m.map = null));
    markers.current = [];

    const bounds = new google.maps.LatLngBounds();
    const located = stops.filter((s) => s.lat != null && s.lng != null);

    located.forEach((stop) => {
      const isVisited = visited?.has(stop.name);
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapObj.current,
        label: {
          text: String(stop.order),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "600",
        },
        title: stop.name,
        icon: pinIcon(isVisited ? "#9aa7b5" : "#048a81"),
      });

      marker.addListener("click", () => {
        infoWindow.current.setContent(
          `<div style="max-width:220px">
             <strong>Day ${stop.day} · ${escapeHtml(stop.name)}</strong>
             <p style="margin:6px 0 0;font-size:13px;color:#3c4a5a">${escapeHtml(
               stop.description
             )}</p>
           </div>`
        );
        infoWindow.current.open(mapObj.current, marker);
      });

      markers.current.push(marker);
      bounds.extend(marker.getPosition());
    });

    if (located.length === 1) {
      mapObj.current.setCenter(bounds.getCenter());
      mapObj.current.setZoom(14);
    } else if (located.length > 1) {
      mapObj.current.fitBounds(bounds, 60);
    }
  }, [stops, visited]);

  if (error) {
    return <div style={styles.placeholder}>{error}</div>;
  }

  return <div ref={mapRef} style={styles.map} />;
}

function pinIcon(color) {
  const google = window.google;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 12,
    labelOrigin: new google.maps.Point(0, 0),
  };
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const styles = {
  map: { width: "100%", height: "100%", minHeight: 360, borderRadius: 12 },
  placeholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 24,
    minHeight: 360,
    background: "#e9eef3",
    borderRadius: 12,
    color: "var(--muted)",
    fontSize: 14,
  },
};
