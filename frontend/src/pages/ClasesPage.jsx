import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarCatalogosClases } from "../services/catalogosClases";
import { listarClases } from "../services/clases";

const listadoInicial = {
  cargando: true,
  clases: [],
  haySiguiente: false,
  error: "",
};

const catalogosIniciales = {
  datos: null,
  error: "",
};

function indexarNombres(registros) {
  return new Map(registros.map(({ id, nombre }) => [id, nombre]));
}

export default function ClasesPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const { state } = useLocation();
  const mensaje = typeof state?.mensaje === "string" ? state.mensaje : "";

  const [pagina, setPagina] = useState(0);
  const [intentoListado, setIntentoListado] = useState(0);
  const [intentoCatalogos, setIntentoCatalogos] = useState(0);
  const [listado, setListado] = useState(listadoInicial);
  const [catalogos, setCatalogos] = useState(catalogosIniciales);

  useEffect(() => {
    const controlador = new AbortController();

    consultarCatalogosClases({ token, signal: controlador.signal })
      .then((datos) => {
        if (controlador.signal.aborted) return;

        setCatalogos({
          datos: {
            asignaturas: indexarNombres(datos.asignaturas),
            grupos: indexarNombres(datos.grupos),
            profesores: indexarNombres(datos.profesores),
          },
          error: "",
        });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setCatalogos({
          datos: null,
          error: error.message || "No se pudieron cargar los catálogos.",
        });
      });

    return () => controlador.abort();
  }, [token, intentoCatalogos, limpiarSesion]);

  useEffect(() => {
    const controlador = new AbortController();

    listarClases({ token, pagina, signal: controlador.signal })
      .then(({ clases, haySiguiente }) => {
        if (controlador.signal.aborted) return;

        setListado({ cargando: false, clases, haySiguiente, error: "" });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setListado({
          ...listadoInicial,
          cargando: false,
          error: error.message || "No se pudieron cargar las clases.",
        });
      });

    return () => controlador.abort();
  }, [token, pagina, intentoListado, limpiarSesion]);

  function cambiarPagina(nuevaPagina) {
    setListado(listadoInicial);
    setPagina(nuevaPagina);
  }

  function reintentar() {
    if (catalogos.error) {
      setCatalogos(catalogosIniciales);
      setIntentoCatalogos((actual) => actual + 1);
    }

    if (listado.error) {
      setListado(listadoInicial);
      setIntentoListado((actual) => actual + 1);
    }
  }

  const error = listado.error || catalogos.error;
  const cargando = !error && (listado.cargando || !catalogos.datos);
  const nombres = catalogos.datos;

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">Clases</h1>
        <p className="page__description">
          Consulta las clases y los profesores asignados.
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

        {cargando && <p role="status">Cargando clases…</p>}

        {error && (
          <div className="profesores__feedback">
            <p className="message message--error" role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        )}

        {!cargando &&
          !error &&
          nombres &&
          (listado.clases.length === 0 ? (
            <p>No hay clases en esta página.</p>
          ) : (
            <ul className="profesores__list">
              {listado.clases.map((clase) => (
                <li key={clase.id}>
                  <Card className="profesor-row clase-row">
                    <div className="profesor-row__identity">
                      <h2 className="profesor-row__name">
                        {nombres.asignaturas.get(clase.asignatura_id) ??
                          "Asignatura sin nombre"}{" "}
                        ·{" "}
                        {nombres.grupos.get(clase.grupo_id) ??
                          "Grupo sin nombre"}
                      </h2>
                      <span className="profesor-row__status">
                        {nombres.profesores.get(clase.profesor_id) ??
                          "Profesor sin nombre"}{" "}
                        · {clase.activo ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <Button
                      variant="edit"
                      onClick={() =>
                        navigate(`/admin/clases/${clase.id}/editar`)
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

      <nav className="pagination" aria-label="Páginas de clases">
        <Button
          variant="secondary"
          disabled={pagina === 0 || cargando || Boolean(error)}
          onClick={() => cambiarPagina(pagina - 1)}
        >
          Anterior
        </Button>

        <span>Página {pagina + 1}</span>

        <Button
          variant="secondary"
          disabled={cargando || Boolean(error) || !listado.haySiguiente}
          onClick={() => cambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>
      <footer className="page__actions">
        <Button onClick={() => navigate("/admin/clases/crear")}>
          + Crear clase
        </Button>
      </footer>
    </section>
  );
}
