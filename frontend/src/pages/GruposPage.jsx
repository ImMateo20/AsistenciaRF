import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { listarGrupos } from "../services/grupos";

export default function GruposPage() {
  const { token, limpiarSesion } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const mensaje = typeof state?.mensaje === "string" ? state.mensaje : "";

  const [pagina, setPagina] = useState(0);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState({
    estado: "loading",
    grupos: [],
    haySiguiente: false,
    error: "",
  });

  useEffect(() => {
    const controlador = new AbortController();

    listarGrupos({ token, pagina, signal: controlador.signal })
      .then(({ grupos, haySiguiente }) => {
        if (controlador.signal.aborted) return;

        setResultado({
          estado: "success",
          grupos,
          haySiguiente,
          error: "",
        });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setResultado({
          estado: "error",
          grupos: [],
          haySiguiente: false,
          error: error.message || "No se pudieron cargar los grupos.",
        });
      });

    return () => controlador.abort();
  }, [token, pagina, intento, limpiarSesion]);

  function cambiarPagina(nuevaPagina) {
    setResultado((actual) => ({ ...actual, estado: "loading", error: "" }));
    setPagina(nuevaPagina);
  }

  function reintentar() {
    setResultado((actual) => ({ ...actual, estado: "loading", error: "" }));
    setIntento((actual) => actual + 1);
  }

  const cargando = resultado.estado === "loading";

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">Grupos</h1>
        <p className="page__description">
          Consulta los grupos de tu institución.
        </p>
      </header>

      <div className="page__body" aria-busy={cargando}>
        {mensaje && (
          <p
            className="message message--success profesores__notice"
            role="status"
          >
            {mensaje}
          </p>
        )}
        {cargando && <p role="status">Cargando grupos…</p>}

        {resultado.estado === "error" && (
          <div className="profesores__feedback">
            <p className="message message--error" role="alert">
              {resultado.error}
            </p>
            <Button variant="secondary" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        )}

        {resultado.estado === "success" &&
          (resultado.grupos.length === 0 ? (
            <p>No hay grupos en esta página.</p>
          ) : (
            <ul className="profesores__list">
              {resultado.grupos.map((grupo) => (
                <li key={grupo.id}>
                  <Card className="profesor-row grupo-row">
                    <div className="profesor-row__identity">
                      <h2 className="profesor-row__name">{grupo.nombre}</h2>
                      <span className="profesor-row__status">
                        {grupo.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <span className="grupo-row__cantidad">
                      {grupo.cantidad_alumnos}{" "}
                      {grupo.cantidad_alumnos === 1 ? "alumno" : "alumnos"}
                    </span>
                    <Button
                      variant="edit"
                      onClick={() =>
                        navigate(`/admin/grupos/${grupo.id}/editar`)
                      }
                    >
                      Editar
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <nav className="pagination" aria-label="Páginas de grupos">
        <Button
          variant="secondary"
          disabled={pagina === 0 || cargando}
          onClick={() => cambiarPagina(pagina - 1)}
        >
          Anterior
        </Button>

        <span>Página {pagina + 1}</span>

        <Button
          variant="secondary"
          disabled={resultado.estado !== "success" || !resultado.haySiguiente}
          onClick={() => cambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>
      <footer className="page__actions">
        <Button onClick={() => navigate("/admin/grupos/crear")}>
          + Crear grupo
        </Button>
      </footer>
    </section>
  );
}
