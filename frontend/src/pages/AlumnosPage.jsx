import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { listarAlumnos } from "../services/alumnos";

export default function AlumnosPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const mensaje =
    typeof location.state?.mensaje === "string" ? location.state.mensaje : "";

  const { token, limpiarSesion } = useAuth();

  const [pagina, setPagina] = useState(0);
  const [intento, setIntento] = useState(0);

  const [resultado, setResultado] = useState({
    estado: "loading",
    alumnos: [],
    haySiguiente: false,
    error: "",
  });

  useEffect(() => {
    const controlador = new AbortController();

    listarAlumnos({
      token,
      pagina,
      signal: controlador.signal,
    })
      .then((datos) => {
        if (controlador.signal.aborted) return;

        setResultado({
          estado: "success",
          alumnos: datos.alumnos,
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
          estado: "error",
          alumnos: [],
          haySiguiente: false,
          error: error.message || "No se pudieron cargar los alumnos.",
        });
      });

    return () => controlador.abort();
  }, [token, pagina, intento, limpiarSesion]);

  function cambiarPagina(nuevaPagina) {
    setResultado((actual) => ({
      ...actual,
      estado: "loading",
      error: "",
    }));

    setPagina(nuevaPagina);
  }

  function reintentar() {
    setResultado((actual) => ({
      ...actual,
      estado: "loading",
      error: "",
    }));

    setIntento((actual) => actual + 1);
  }

  const cargando = resultado.estado === "loading";

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">Alumnos</h1>

        <p className="page__description">
          Gestiona la información de tu institución.
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

        {cargando && <p role="status">Cargando alumnos…</p>}

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

        {resultado.estado === "success" && (
          <>
            {resultado.alumnos.length === 0 ? (
              <p>No hay alumnos en esta página.</p>
            ) : (
              <ul className="profesores__list">
                {resultado.alumnos.map((alumno) => (
                  <li key={alumno.id}>
                    <Card className="profesor-row">
                      <div className="profesor-row__identity">
                        <h2 className="profesor-row__name">{alumno.nombre}</h2>

                        {!alumno.activo && (
                          <span className="profesor-row__status">Inactivo</span>
                        )}
                      </div>

                      <span className="profesor-row__matricula">
                        {alumno.matricula}
                      </span>

                      <Button
                        variant="edit"
                        onClick={() =>
                          navigate(`/admin/alumnos/${alumno.id}/editar`)
                        }
                      >
                        Editar
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <nav className="pagination" aria-label="Páginas de alumnos">
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
        <Button onClick={() => navigate("/admin/alumnos/registrar")}>
          + Registrar alumno
        </Button>{" "}
      </footer>
    </section>
  );
}
