import { useState } from "react";

// Header account widget. In guest mode it shows "Sign in"; expanded, it's a
// combined sign-in / sign-up form. Signed in, it shows the email + sign out.
export default function AccountBar({ user, ready, onLogin, onRegister, onLogout }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Avoid flashing "Sign in" before the stored token is validated.
  if (!ready) return <div style={styles.bar} aria-hidden="true" />;

  if (user) {
    return (
      <div style={styles.bar}>
        <span style={styles.email} title={user.email}>
          {user.email}
        </span>
        <button className="btn-ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>
    );
  }

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await (mode === "login" ? onLogin : onRegister)(email, password);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div style={styles.bar}>
        <button className="btn-ghost" onClick={() => setOpen(true)}>
          Sign in
        </button>
      </div>
    );
  }

  const isLogin = mode === "login";
  return (
    <form onSubmit={handleSubmit} style={styles.form} aria-label="Account">
      <input
        type="email"
        className="input"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        className="input"
        placeholder="Password (min 8)"
        autoComplete={isLogin ? "current-password" : "new-password"}
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}
      <div style={styles.actions}>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "…" : isLogin ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setMode(isLogin ? "register" : "login");
            setError(null);
          }}
        >
          {isLogin ? "Create an account" : "I already have one"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles = {
  bar: { display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" },
  email: { fontSize: 14, color: "var(--muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  form: { display: "flex", flexDirection: "column", gap: 8, minWidth: 240, maxWidth: 320, marginLeft: "auto" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  error: { margin: 0, color: "#c0392b", fontSize: 13 },
};
