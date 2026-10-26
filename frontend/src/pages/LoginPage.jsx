import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import Button from "../components/Button";
import Card from "../components/Card";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import ilustracion from "../assets/login-facial.png";

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (usuario) {
    return (
      <Navigate
        to={
          usuario.rol === "administrador"
            ? "/admin/profesores"
            : "/profesor/clases"
        }
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const cuenta = await login(correo.trim(), password);

      setPassword("");

      navigate(
        cuenta.rol === "administrador"
          ? "/admin/profesores"
          : "/profesor/clases",
        { replace: true }
      );
    } catch (error) {
      setError(error.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <div className="login__layout">
        <div className="login__illustration">
          <img src={ilustracion} alt="" />
        </div>

        <Card className="login__card">
          <h1 className="login__title">
            Asistencia con
            <br />
            reconocimiento facial
          </h1>

          <h2 className="login__subtitle">Iniciar sesión</h2>

          <form
            className="login__form"
            onSubmit={handleSubmit}
            aria-busy={loading}
          >
            <InputField
              label="Correo electrónico"
              type="email"
              name="correo"
              autoComplete="username"
              placeholder="Escribe tu correo"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              maxLength={254}
              required
              disabled={loading}
            />

            <InputField
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Escribe tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              required
              disabled={loading}
            />

            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="login__submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
