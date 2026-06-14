import { useState } from "react";
import CityForm from "./components/CityForm.jsx";
import ItineraryList from "./components/ItineraryList.jsx";
import MapView from "./components/MapView.jsx";
import { useItinerary } from "./hooks/useItinerary.js";
import { useNarration } from "./hooks/useNarration.js";

export default function App() {
  const { itinerary, city, loading, error, generate, clear } = useItinerary();
  const { active, speaking, loadingName, error: speechError, play, stop } =
    useNarration(city);
  const [visited, setVisited] = useState(() => new Set());

  const hasItinerary = itinerary && itinerary.length > 0;

  // Toggle narration for a stop: stop if it's the one currently speaking,
  // otherwise fetch + play it and mark it visited (mutes its map pin).
  const handleListen = async (stopItem) => {
    if (active?.name === stopItem.name && speaking) {
      stop();
      return;
    }
    const played = await play(stopItem.name);
    if (played) setVisited((prev) => new Set(prev).add(played));
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Wandr</h1>
        <p style={styles.tagline}>Your AI travel guide</p>
      </header>

      <main style={styles.main}>
        <section style={styles.formCard}>
          <CityForm onSubmit={generate} loading={loading} city={city} />
          {error && <p style={styles.error}>{error}</p>}
          {speechError && <p style={styles.error}>{speechError}</p>}
          {hasItinerary && (
            <button onClick={clear} style={styles.clearButton} disabled={loading}>
              Start over
            </button>
          )}
        </section>

        {hasItinerary && (
          <div className="plan-grid">
            <div style={styles.listColumn}>
              <ItineraryList
                stops={itinerary}
                onListen={handleListen}
                active={active}
                speaking={speaking}
                loadingName={loadingName}
                visited={visited}
              />
            </div>
            <div className="map-column">
              <MapView stops={itinerary} visited={visited} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" },
  header: { marginBottom: 20 },
  logo: { margin: 0, fontSize: 28, color: "var(--teal)", letterSpacing: -0.5 },
  tagline: { margin: "2px 0 0", fontSize: 13.5, color: "var(--muted)" },
  main: { display: "flex", flexDirection: "column", gap: 22 },
  formCard: {
    background: "var(--white)",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 1px 3px rgba(46,64,87,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  error: { margin: 0, color: "#c0392b", fontSize: 14 },
  clearButton: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "1px solid #d7dee6",
    color: "var(--muted)",
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 600,
  },
  listColumn: { minWidth: 0 },
};
