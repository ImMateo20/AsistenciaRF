import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { listarAsignaturas } from "../services/asignaturas";

const resultadoInicial = {
  estado: "cargando",
  asignaturas: [],
  haySiguiente: false,
  error: "",
};

export default function AsignaturasPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const { state } = useLocation();
  const mensaje = typeof state?.mensaje === "string" ? state.mensaje : "";

  const [pagina, setPagina] = useState(0);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(resultadoInicial);

  useEffect(() => {
    const controlador = new AbortController();

    listarAsignaturas({ token, pagina, signal: controlador.signal })
      .then((datos) => {
        if (controlador.signal.aborted) return;

        setResultado({
          estado: "listo",
          asignaturas: datos.asignaturas,
          haySiguiente: datos.haySiguiente,
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
          ...resultadoInicial,
          estado: "error",
          error: error.message || "No se pudieron cargar las asignaturas.",
        });
      });

    return () => controlador.abort();
  }, [token, pagina, intento, limpiarSesion]);

  function cambiarPagina(nuevaPagina) {
    
    setResultado(resultadoInicial);
    setPagina(nuevaPagina);
  }

  function reintentar() {
    setResultado(resultadoInicial);
    setIntento((actual) => actual + 1);
  }

  const cargando = resultado.estado === "cargando";

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">Asignaturas</h1>
        <p className="page__description">
          Consulta y administra las asignaturas de tu institución.
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

        {cargando && <p role="status">Cargando asignaturas…</p>}

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

        {resultado.estado === "listo" &&
          (resultado.asignaturas.length === 0 ? (
            <p>No hay asignaturas en esta página.</p>
          ) : (
            <ul className="profesores__list">
              {resultado.asignaturas.map((asignatura) => (
                <li key={asignatura.id}>
                  <Card className="profesor-row">
                    <div className="profesor-row__identity">
                      <h2 className="profesor-row__name">
                        {asignatura.nombre}
                      </h2>
                      <span className="profesor-row__status">
                        {asignatura.activo ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <span className="profesor-row__matricula">
                      {asignatura.clave}
                    </span>
                    <Button
                      variant="edit"
                      onClick={() =>
                        navigate(`/admin/asignaturas/${asignatura.id}/editar`)
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

      <nav className="pagination" aria-label="Páginas de asignaturas">
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
          disabled={resultado.estado !== "listo" || !resultado.haySiguiente}
          onClick={() => cambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>

      <footer className="page__actions">
        <Button onClick={() => navigate("/admin/asignaturas/crear")}>
          + Crear asignatura
        </Button>
      </footer>
    </section>
  );
}
