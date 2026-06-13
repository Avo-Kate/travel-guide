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
            style={styles.input}
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
            style={styles.input}
            disabled={loading}
          />
        </label>
      </div>

      <button type="submit" style={styles.button} disabled={loading || !city.trim()}>
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
  input: {
    padding: "12px 14px",
    fontSize: 16,
    border: "1px solid #d7dee6",
    borderRadius: 10,
    outline: "none",
  },
  button: {
    padding: "13px 18px",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--white)",
    background: "var(--teal)",
    border: "none",
    borderRadius: 10,
  },
};
