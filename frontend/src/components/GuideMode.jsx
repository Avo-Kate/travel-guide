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
  const [active, setActive] = useState(null); // { name, text } currently shown
  const [loadingStop, setLoadingStop] = useState(null);
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
      setLoadingStop(stop.name);
      setStatus(`Narrating ${stop.name}…`);
      const text = await fetchNarration(stop.name, city);
      setActive({ name: stop.name, text });
      speak(text);
    } catch (err) {
      setActive(null);
      setStatus(`Couldn't fetch narration: ${err.message}`);
    } finally {
      setLoadingStop(null);
    }
  }

  // POC: tap a stop to hear (and read) what the guide would say there, without
  // having to physically walk within range. Mirrors the GPS auto-trigger.
  function handleSelect(stop) {
    narratedRef.current.add(stop.name);
    onVisit?.(stop.name);
    narrate(stop);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
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
        {!supported ? (
          <div style={styles.nearest}>
            Live GPS isn't available here — tap a stop below to hear its guide.
          </div>
        ) : nearest ? (
          <div style={styles.nearest}>
            Nearest stop: <strong>{nearest.name}</strong>
            <span style={styles.dist}>{Math.round(nearest.distance)} m away</span>
          </div>
        ) : (
          <div style={styles.nearest}>{status}</div>
        )}
        {geoError && <div style={styles.error}>Location error: {geoError}</div>}
      </div>

      {active && (
        <div style={styles.narrationCard}>
          <div style={styles.narrationHead}>
            <strong>{active.name}</strong>
            <button
              onClick={speaking ? stopSpeaking : () => speak(active.text)}
              style={styles.speakButton}
            >
              {speaking ? "■ Stop" : "▶ Replay"}
            </button>
          </div>
          <p style={styles.narrationText}>{active.text}</p>
        </div>
      )}

      <div style={styles.hint}>Tap a stop to hear what your guide would say.</div>

      <ul style={styles.list}>
        {located.map((stop) => {
          const isVisited = visited?.has(stop.name);
          const isLoading = loadingStop === stop.name;
          const isActive = active?.name === stop.name;
          return (
            <li key={stop.name}>
              <button
                onClick={() => handleSelect(stop)}
                disabled={isLoading}
                style={{
                  ...styles.item,
                  ...(isActive ? styles.itemActive : null),
                }}
              >
                <span style={{ ...styles.tick, color: isVisited ? "var(--teal)" : "#c4ccd6" }}>
                  {isVisited ? "✓" : "○"}
                </span>
                <span style={{ color: isVisited ? "var(--muted)" : "var(--navy)", flex: 1 }}>
                  {stop.name}
                </span>
                <span style={styles.cue}>
                  {isLoading ? "…" : isActive && speaking ? "▮▮" : "▶"}
                </span>
              </button>
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
  hint: { fontSize: 13, color: "var(--muted)", marginTop: -4 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    textAlign: "left",
    background: "var(--white)",
    border: "1px solid transparent",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14.5,
    cursor: "pointer",
  },
  itemActive: { border: "1px solid var(--teal)", background: "#f0fbfa" },
  cue: { color: "var(--teal)", fontSize: 12, fontWeight: 700 },
  narrationCard: {
    background: "var(--white)",
    border: "1px solid var(--teal)",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  narrationHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 16,
    color: "var(--navy)",
  },
  speakButton: {
    border: "1px solid var(--teal)",
    background: "transparent",
    color: "var(--teal)",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  narrationText: { margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--navy)" },
  tick: { fontWeight: 700, width: 16, textAlign: "center" },
  note: {
    background: "#e9eef3",
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    color: "var(--muted)",
  },
};
