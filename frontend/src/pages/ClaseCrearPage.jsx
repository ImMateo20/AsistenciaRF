import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarCatalogosClases } from "../services/catalogosClases";
import { crearClase } from "../services/clases";

const campos = [
  { nombre: "asignatura_id", etiqueta: "Asignatura", catalogo: "asignaturas" },
  { nombre: "grupo_id", etiqueta: "Grupo", catalogo: "grupos" },
  { nombre: "profesor_id", etiqueta: "Profesor", catalogo: "profesores" },
];

export default function ClaseCrearPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [seleccion, setSeleccion] = useState({});
  const [catalogos, setCatalogos] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    consultarCatalogosClases({ token, signal: controlador.signal })
      .then((datos) => {
        if (!controlador.signal.aborted) setCatalogos(datos);
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setErrorCarga(error.message || "No se pudieron cargar las opciones.");
      });

    return () => controlador.abort();
  }, [token, intento, limpiarSesion]);

  const cargando = !catalogos && !errorCarga;
  const faltantes = catalogos
    ? campos.filter(({ catalogo }) => catalogos[catalogo].length === 0)
    : [];

  function cancelar() {
    if (guardando) return;

    if (
      Object.values(seleccion).some(Boolean) &&
      !window.confirm("¿Quieres salir sin guardar la clase?")
    ) {
      return;
    }

    navigate("/admin/clases");
  }

  async function guardar(evento) {
    evento.preventDefault();

    if (guardando || !catalogos || faltantes.length > 0) return;

    const datos = {};

    for (const { nombre, etiqueta, catalogo } of campos) {
      const id = Number(seleccion[nombre]);

      if (!catalogos[catalogo].some((opcion) => opcion.id === id)) {
        setError(
          `Selecciona una opción válida para ${etiqueta.toLowerCase()}.`
        );
        return;
      }

      datos[nombre] = id;
    }

    setGuardando(true);
    setError("");

    try {
      await crearClase({ datos, token });

      navigate("/admin/clases", {
        replace: true,
        state: { mensaje: "Clase creada correctamente." },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setError(error.message || "No se pudo crear la clase.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Crear clase</h1>
        <p className="page__description">
          Selecciona la asignatura, el grupo y el profesor.
        </p>
      </header>

      <form
        className="profesor-form"
        onSubmit={guardar}
        aria-busy={cargando || guardando}
      >
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            {cargando && <p role="status">Cargando opciones…</p>}

            {errorCarga && (
              <div className="profesores__feedback">
                <p className="message message--error" role="alert">
                  {errorCarga}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setErrorCarga("");
                    setIntento((actual) => actual + 1);
                  }}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {catalogos &&
              campos.map(({ nombre, etiqueta, catalogo }) => (
                <div className="field" key={nombre}>
                  <label className="field__label" htmlFor={`clase-${nombre}`}>
                    {etiqueta}
                  </label>

                  <select
                    id={`clase-${nombre}`}
                    className="field__input"
                    value={seleccion[nombre] ?? ""}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      setSeleccion((actual) => ({
                        ...actual,
                        [nombre]: valor,
                      }));
                      setError("");
                    }}
                    disabled={guardando || catalogos[catalogo].length === 0}
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {catalogos[catalogo].map((opcion) => (
                      <option key={opcion.id} value={opcion.id}>
                        {opcion.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

            {faltantes.length > 0 && (
              <p className="message message--error" role="alert">
                No hay opciones para:{" "}
                {faltantes.map(({ etiqueta }) => etiqueta).join(", ")}.
              </p>
            )}

            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {catalogos && faltantes.length === 0 ? (
          <FormActions
            onCancel={cancelar}
            submitLabel="Crear clase"
            loading={guardando}
          />
        ) : (
          <footer className="page__actions">
            <Button type="button" variant="secondary" onClick={cancelar}>
              Cancelar
            </Button>
          </footer>
        )}
      </form>
    </section>
  );
}
    