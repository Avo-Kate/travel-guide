const CATEGORY_COLORS = {
  landmark: "#048a81",
  museum: "#7b5ea7",
  park: "#3f9d52",
  food: "#d9822b",
  neighbourhood: "#2e4057",
  viewpoint: "#1d8bbd",
  other: "#6b7a8d",
};

// Label for a stop's Listen button, based on its current narration state.
function listenLabel({ isLoading, isActive, speaking }) {
  if (isLoading) return "…";
  if (isActive && speaking) return "■ Stop";
  if (isActive) return "▶ Replay";
  return "▶ Listen";
}

// Groups stops by day and renders each with category badge, description and
// duration. Each geocoded stop also gets a "Listen" button that plays Claude's
// narration aloud; when a stop is active its narration text is shown inline.
export default function ItineraryList({
  stops,
  onListen,
  active,
  speaking,
  loadingName,
  visited,
}) {
  if (!stops || stops.length === 0) return null;

  const byDay = stops.reduce((acc, stop) => {
    (acc[stop.day] ||= []).push(stop);
    return acc;
  }, {});

  const days = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div style={styles.wrap}>
      {days.map((day) => (
        <section key={day} style={styles.day}>
          <h3 className="day-heading">Day {day}</h3>
          {byDay[day]
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stop) => {
              const located = stop.lat != null && stop.lng != null;
              const isActive = active?.name === stop.name;
              const isLoading = loadingName === stop.name;
              const isVisited = visited?.has(stop.name);
              return (
                <article
                  key={`${day}-${stop.order}`}
                  className={isActive ? "stop-card is-active" : "stop-card"}
                  style={styles.card}
                >
                  <div style={styles.cardHeader}>
                    <span style={styles.name}>
                      {isVisited && <span style={styles.tick}>✓ </span>}
                      {stop.order}. {stop.name}
                    </span>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          CATEGORY_COLORS[stop.category] || CATEGORY_COLORS.other,
                      }}
                    >
                      {stop.category}
                    </span>
                  </div>
                  <p style={styles.description}>{stop.description}</p>
                  <div style={styles.footer}>
                    <span style={styles.duration}>
                      ⏱ {stop.duration_minutes} min
                      {!located && "  ·  📍 location not found"}
                    </span>
                    {located && onListen && (
                      <button
                        onClick={() => onListen(stop)}
                        disabled={isLoading}
                        className="listen-btn"
                        style={isActive ? styles.listenActive : styles.listen}
                      >
                        {listenLabel({ isLoading, isActive, speaking })}
                      </button>
                    )}
                  </div>
                  {isActive && active.text && (
                    <p className="narration-text" style={styles.narration}>
                      {active.text}
                    </p>
                  )}
                </article>
              );
            })}
        </section>
      ))}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 22 },
  day: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    padding: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  name: { fontWeight: 600, fontSize: 15.5 },
  tick: { color: "var(--teal)" },
  badge: {
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 999,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  description: { margin: "0 0 8px", fontSize: 14, lineHeight: 1.5, color: "#3c4a5a" },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  duration: { fontSize: 12.5, color: "var(--muted)" },
  listen: {
    border: "1px solid var(--teal)",
    background: "transparent",
    color: "var(--teal)",
    padding: "6px 14px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  listenActive: {
    border: "1px solid var(--teal)",
    background: "var(--teal)",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  narration: {
    margin: "12px 0 0",
    padding: "12px 16px",
    background: "#f0fbfa",
    borderLeft: "3px solid var(--teal)",
    borderRadius: "0 10px 10px 0",
    fontSize: 14,
    lineHeight: 1.6,
    color: "var(--navy)",
  },
};
