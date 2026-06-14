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
      <header className="app-header">
        <h1 className="wordmark">Wandr</h1>
        <p className="tagline">Your AI travel guide</p>
      </header>

      <main style={styles.main}>
        <section className="surface-card" style={styles.formCard}>
          <CityForm onSubmit={generate} loading={loading} city={city} />
          {error && <p style={styles.error}>{error}</p>}
          {speechError && <p style={styles.error}>{speechError}</p>}
          {hasItinerary && (
            <button onClick={clear} className="btn-ghost" disabled={loading}>
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
  page: { maxWidth: 1100, margin: "0 auto", padding: "28px 16px 60px" },
  main: { display: "flex", flexDirection: "column", gap: 22 },
  formCard: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  error: { margin: 0, color: "#c0392b", fontSize: 14 },
  listColumn: { minWidth: 0 },
};
