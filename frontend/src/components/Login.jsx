import { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Usuario y contraseña son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const user = await onLogin(username.trim(), password);
      if (!user) setError("Credenciales inválidas.");
    } catch (err) {
      setError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <form className="login__form card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <svg className="login__logo" viewBox="0 0 32 32" aria-hidden="true">
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
            <circle cx="16" cy="16" r="1.6" fill="var(--color-accent)" />
            <line
              x1="16"
              y1="16"
              x2="16"
              y2="8.5"
              stroke="var(--color-text)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="16"
              x2="21"
              y2="18.5"
              stroke="var(--color-text)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="4"
              x2="16"
              y2="6.5"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="25.5"
              x2="16"
              y2="28"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="16"
              x2="6.5"
              y2="16"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="25.5"
              y1="16"
              x2="28"
              y2="16"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="login__brand-name">Relojes App</span>
        </div>
        <h1 className="login__title">Iniciar sesión</h1>
        <label className="login__label">
          Usuario
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
        </label>
        <label className="login__label">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>
        {error && <p className="login__error">{error}</p>}
        <button type="submit" className="btn btn--login" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <footer className="login__footer">
        Desarrollado por{" "}
        <a
          href="https://github.com/Ticran"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cristian Andrada
        </a>
      </footer>
    </div>
  );
}
