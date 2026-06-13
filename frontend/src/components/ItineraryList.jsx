const CATEGORY_COLORS = {
  landmark: "#048a81",
  museum: "#7b5ea7",
  park: "#3f9d52",
  food: "#d9822b",
  neighbourhood: "#2e4057",
  viewpoint: "#1d8bbd",
  other: "#6b7a8d",
};

// Groups stops by day and renders each with category badge, description, duration.
export default function ItineraryList({ stops }) {
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
          <h3 style={styles.dayHeading}>Day {day}</h3>
          {byDay[day]
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stop, i) => (
              <article key={`${day}-${i}`} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.name}>
                    {stop.order}. {stop.name}
                  </span>
                  <span
                    style={{
                      ...styles.badge,
                      background: CATEGORY_COLORS[stop.category] || CATEGORY_COLORS.other,
                    }}
                  >
                    {stop.category}
                  </span>
                </div>
                <p style={styles.description}>{stop.description}</p>
                <span style={styles.duration}>
                  ⏱ {stop.duration_minutes} min
                  {stop.lat == null && "  ·  📍 location not found"}
                </span>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 22 },
  day: { display: "flex", flexDirection: "column", gap: 12 },
  dayHeading: { margin: 0, fontSize: 18, color: "var(--navy)" },
  card: {
    background: "var(--white)",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(46,64,87,0.08)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  name: { fontWeight: 600, fontSize: 15.5 },
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
  duration: { fontSize: 12.5, color: "var(--muted)" },
};
