// Saved trips for a signed-in user. Click a trip to load it into the planner,
// or delete it. Renders nothing until there's history to show.
export default function TripHistory({ trips, onLoad, onDelete, disabled }) {
  if (!trips.length) return null;

  return (
    <section className="surface-card" style={styles.card} aria-label="Your saved trips">
      <h2 style={styles.heading}>Your trips</h2>
      <ul style={styles.list}>
        {trips.map((trip) => (
          <li key={trip.id} style={styles.item}>
            <button
              className="btn-ghost"
              style={styles.load}
              onClick={() => onLoad(trip.id)}
              disabled={disabled}
            >
              {trip.city} · {trip.days} {trip.days === 1 ? "day" : "days"}
            </button>
            <button
              className="btn-ghost"
              aria-label={`Delete ${trip.city} trip`}
              onClick={() => onDelete(trip.id)}
              disabled={disabled}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const styles = {
  card: { display: "flex", flexDirection: "column", gap: 10 },
  heading: { margin: 0, fontSize: 16 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 },
  item: { display: "flex", alignItems: "center", gap: 8 },
  load: { flex: 1, textAlign: "left" },
};
