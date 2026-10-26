import { useState } from "react";
import { Outlet } from "react-router";

import Button from "../components/Button";
import Sidebar from "../components/Sidebar";
import useAuth from "../context/useAuth";

export default function AppLayout() {
  const { usuario, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await logout();
    } catch (error) {
      setError(error.message || "No se pudo cerrar sesión.");
    } finally {
      setLoading(false);
    }
  }

  if (!usuario) {
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar rol={usuario.rol}>
        {error && (
          <p className="message message--error" role="alert">
            {error}
          </p>
        )}

        <Button variant="secondary" onClick={handleLogout} disabled={loading}>
          {loading ? "Cerrando…" : "Cerrar sesión"}
        </Button>
      </Sidebar>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
