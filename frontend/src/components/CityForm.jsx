import { useState } from "react";

// City + duration input form. Calls onSubmit(city, days) and shows a loading
// message while the itinerary is being generated.
export default function CityForm({ onSubmit, loading, city: initialCity }) {
  const [city, setCity] = useState(initialCity || "");
  const [days, setDays] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!city.trim() || loading) return;
    onSubmit(city.trim(), Number(days));
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <label style={styles.field}>
          <span style={styles.label}>City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Paris"
            className="input"
            disabled={loading}
          />
        </label>

        <label style={{ ...styles.field, maxWidth: 110 }}>
          <span style={styles.label}>Days</span>
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="input"
            disabled={loading}
          />
        </label>
      </div>

      <button type="submit" className="btn-primary" disabled={loading || !city.trim()}>
        {loading ? `Finding the best stops in ${city || "your city"}…` : "Plan my trip"}
      </button>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 14 },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--muted)" },
};
