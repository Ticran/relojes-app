import { useState } from "react";
import VidriLogo from "./VidriLogo.jsx";

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
          <VidriLogo variant="light" size={27} />
          <span className="login__brand-name">Vidri</span>
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
