import { useState } from "react";
import AccountBar from "./components/AccountBar.jsx";
import CityForm from "./components/CityForm.jsx";
import ItineraryList from "./components/ItineraryList.jsx";
import MapView from "./components/MapView.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useItinerary } from "./hooks/useItinerary.js";
import { useNarration } from "./hooks/useNarration.js";

export default function App() {
  const { user, ready, login, register, logout } = useAuth();
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
        <div>
          <h1 className="wordmark">Wandr</h1>
          <p className="tagline">Your AI travel guide</p>
        </div>
        <AccountBar
          user={user}
          ready={ready}
          onLogin={login}
          onRegister={register}
          onLogout={logout}
        />
      </header>

      <main style={styles.main}>
        <section className="surface-card" style={styles.formCard}>
          <CityForm onSubmit={generate} loading={loading} city={city} />
          {error && (
            <p style={styles.error} role="alert">
              {error}
            </p>
          )}
          {speechError && (
            <p style={styles.error} role="alert">
              {speechError}
            </p>
          )}
          {hasItinerary && (
            <button onClick={clear} className="btn-ghost" disabled={loading}>
              Start over
            </button>
          )}
        </section>

        {loading && !hasItinerary && <ItinerarySkeleton />}

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

// Placeholder shown while the itinerary is generating (~10–20s of web search),
// so the page reads as "working" rather than blank.
function ItinerarySkeleton() {
  return (
    <div
      className="skeleton-stack"
      role="status"
      aria-live="polite"
      aria-label="Building your itinerary"
    >
      <span style={styles.srOnly}>Building your itinerary…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface-card skeleton-card" aria-hidden="true">
          <div className="skeleton-line" style={{ width: "55%" }} />
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "28px 16px 60px" },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
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
