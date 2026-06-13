import { useEffect, useRef, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { fetchNarration } from "../utils/api.js";
import { haversineDistance } from "../utils/distance.js";

const PROXIMITY_METRES = 100;
const CHECK_INTERVAL_MS = 10000;

// On-the-go guide. Tracks GPS, and when the traveller comes within 100m of an
// un-narrated stop it fetches a narration and reads it aloud via Web Speech.
export default function GuideMode({ stops, city, visited, onVisit }) {
  const { position, error: geoError, supported } = useGeolocation(true);
  const [nearest, setNearest] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Waiting for your location…");
  const narratedRef = useRef(new Set(visited ? [...visited] : []));

  const located = (stops || []).filter((s) => s.lat != null && s.lng != null);

  useEffect(() => {
    if (!position || located.length === 0) return;

    const tick = async () => {
      // Find the closest stop to the current position.
      let closest = null;
      let closestDist = Infinity;
      for (const stop of located) {
        const d = haversineDistance(position.lat, position.lng, stop.lat, stop.lng);
        if (d < closestDist) {
          closestDist = d;
          closest = stop;
        }
      }
      setNearest(closest ? { ...closest, distance: closestDist } : null);

      if (
        closest &&
        closestDist <= PROXIMITY_METRES &&
        !narratedRef.current.has(closest.name)
      ) {
        narratedRef.current.add(closest.name);
        onVisit?.(closest.name);
        await narrate(closest);
      }
    };

    tick();
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, stops]);

  async function narrate(stop) {
    try {
      setStatus(`Narrating ${stop.name}…`);
      const text = await fetchNarration(stop.name, city);
      speak(text);
    } catch (err) {
      setStatus(`Couldn't fetch narration: ${err.message}`);
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      setStatus("Speech synthesis isn't supported on this device.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setStatus("Listening for your next stop…");
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  if (!supported) {
    return <div style={styles.note}>Geolocation isn't available in this browser.</div>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.statusCard}>
        <div style={styles.indicator}>
          <span
            style={{
              ...styles.dot,
              background: speaking ? "var(--teal)" : "#c4ccd6",
            }}
          />
          {speaking ? "Speaking…" : "Listening…"}
        </div>
        {nearest ? (
          <div style={styles.nearest}>
            Nearest stop: <strong>{nearest.name}</strong>
            <span style={styles.dist}>{Math.round(nearest.distance)} m away</span>
          </div>
        ) : (
          <div style={styles.nearest}>{status}</div>
        )}
        {geoError && <div style={styles.error}>Location error: {geoError}</div>}
      </div>

      <ul style={styles.list}>
        {located.map((stop) => {
          const isVisited = visited?.has(stop.name);
          return (
            <li key={stop.name} style={styles.item}>
              <span style={{ ...styles.tick, color: isVisited ? "var(--teal)" : "#c4ccd6" }}>
                {isVisited ? "✓" : "○"}
              </span>
              <span style={{ color: isVisited ? "var(--muted)" : "var(--navy)" }}>
                {stop.name}
              </span>
            </li>
          );
        })}
      </ul>

      {located.length === 0 && (
        <div style={styles.note}>
          No stops have map coordinates yet — generate an itinerary with a Google
          Maps API key set on the backend.
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  statusCard: {
    background: "var(--navy)",
    color: "var(--white)",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  indicator: { display: "flex", alignItems: "center", gap: 8, fontWeight: 600 },
  dot: { width: 12, height: 12, borderRadius: "50%", display: "inline-block" },
  nearest: { fontSize: 14, opacity: 0.95 },
  dist: { display: "block", fontSize: 12.5, opacity: 0.75, marginTop: 2 },
  error: { fontSize: 12.5, color: "#ffb4a8" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--white)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14.5,
  },
  tick: { fontWeight: 700, width: 16, textAlign: "center" },
  note: {
    background: "#e9eef3",
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    color: "var(--muted)",
  },
};
