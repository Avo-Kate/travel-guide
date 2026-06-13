import { useState } from "react";
import CityForm from "./components/CityForm.jsx";
import GuideMode from "./components/GuideMode.jsx";
import ItineraryList from "./components/ItineraryList.jsx";
import MapView from "./components/MapView.jsx";
import { useItinerary } from "./hooks/useItinerary.js";

export default function App() {
  const { itinerary, city, loading, error, generate, clear } = useItinerary();
  const [mode, setMode] = useState("plan"); // "plan" | "guide"
  const [visited, setVisited] = useState(() => new Set());

  const markVisited = (name) =>
    setVisited((prev) => new Set(prev).add(name));

  const hasItinerary = itinerary && itinerary.length > 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>Wandr</h1>
          <p style={styles.tagline}>Your AI travel guide</p>
        </div>
        {hasItinerary && (
          <div style={styles.modeToggle}>
            <button
              onClick={() => setMode("plan")}
              style={mode === "plan" ? styles.tabActive : styles.tab}
            >
              Plan
            </button>
            <button
              onClick={() => setMode("guide")}
              style={mode === "guide" ? styles.tabActive : styles.tab}
            >
              Guide
            </button>
          </div>
        )}
      </header>

      <main style={styles.main}>
        <section style={styles.formCard}>
          <CityForm onSubmit={generate} loading={loading} city={city} />
          {error && <p style={styles.error}>{error}</p>}
          {hasItinerary && (
            <button onClick={clear} style={styles.clearButton} disabled={loading}>
              Start over
            </button>
          )}
        </section>

        {hasItinerary && mode === "plan" && (
          <div className="plan-grid">
            <div style={styles.listColumn}>
              <ItineraryList stops={itinerary} />
            </div>
            <div className="map-column">
              <MapView stops={itinerary} visited={visited} />
            </div>
          </div>
        )}

        {hasItinerary && mode === "guide" && (
          <GuideMode
            stops={itinerary}
            city={city}
            visited={visited}
            onVisit={markVisited}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  logo: { margin: 0, fontSize: 28, color: "var(--teal)", letterSpacing: -0.5 },
  tagline: { margin: "2px 0 0", fontSize: 13.5, color: "var(--muted)" },
  modeToggle: {
    display: "flex",
    background: "#e3e9ef",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    border: "none",
    background: "transparent",
    color: "var(--navy)",
    padding: "8px 18px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
  },
  tabActive: {
    border: "none",
    background: "var(--teal)",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
  },
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
