import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarProfesores } from "../services/profesores";

export default function ProfesoresPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const mensaje =
    typeof location.state?.mensaje === "string" ? location.state.mensaje : "";

  const { token, limpiarSesion } = useAuth();

  const [pagina, setPagina] = useState(0);
  const [intento, setIntento] = useState(0);

  const [resultado, setResultado] = useState({
    estado: "loading",
    profesores: [],
    haySiguiente: false,
    error: "",
  });

  useEffect(() => {
    const controlador = new AbortController();

    consultarProfesores(token, pagina, controlador.signal)
      .then((datos) => {
        if (controlador.signal.aborted) {
          return;
        }

        setResultado({
          estado: "success",
          profesores: datos.profesores,
          haySiguiente: datos.haySiguiente,
          error: "",
        });
      })
      .catch((error) => {
        if (controlador.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setResultado({
          estado: "error",
          profesores: [],
          haySiguiente: false,
          error: error.message || "No se pudieron cargar los profesores.",
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
    <section className="page">
      <header>
        <h1 className="page__title">Profesores</h1>

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
        {cargando && <p role="status">Cargando profesores…</p>}

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
            {resultado.profesores.length === 0 ? (
              <p>No hay profesores en esta página.</p>
            ) : (
              <ul className="profesores__list">
                {resultado.profesores.map((profesor) => (
                  <li key={profesor.id}>
                    <Card className="profesor-row">
                      <div className="profesor-row__identity">
                        <h2 className="profesor-row__name">
                          {profesor.nombre}
                        </h2>

                        {!profesor.activo && (
                          <span className="profesor-row__status">Inactivo</span>
                        )}
                      </div>

                      <span className="profesor-row__matricula">
                        {profesor.matricula}
                      </span>

                      <Button
                        variant="edit"
                        onClick={() =>
                          navigate(`/admin/profesores/${profesor.id}/editar`)
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

      <nav className="pagination" aria-label="Páginas de profesores">
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
          disabled={!resultado.haySiguiente || cargando}
          onClick={() => cambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>

      <footer className="page__actions">
        <Button onClick={() => navigate("/admin/profesores/registrar")}>
          + Registrar profesor
        </Button>{" "}
      </footer>
    </section>
  );
}
