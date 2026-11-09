import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarCatalogosClases } from "../services/catalogosClases";
import { editarClase, obtenerClase } from "../services/clases";

const campos = [
  { nombre: "asignatura_id", etiqueta: "Asignatura", catalogo: "asignaturas" },
  { nombre: "grupo_id", etiqueta: "Grupo", catalogo: "grupos" },
  { nombre: "profesor_id", etiqueta: "Profesor", catalogo: "profesores" },
];

export default function ClaseEditarPage() {
  const { claseId } = useParams();

  return <CargarClase key={claseId} claseId={claseId} />;
}

function CargarClase({ claseId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const idValido = /^[1-9][0-9]*$/.test(claseId ?? "");

  useEffect(() => {
    if (!idValido) return;

    const controlador = new AbortController();
    const signal = controlador.signal;

    Promise.all([
      obtenerClase({ claseId, token, signal }),
      consultarCatalogosClases({ token, signal }),
    ])
      .then(([clase, catalogos]) => {
        if (!signal.aborted) setResultado({ clase, catalogos });
      })
      .catch((error) => {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setError(error.message || "No se pudo cargar la clase.");
      });

    return () => controlador.abort();
  }, [claseId, idValido, token, limpiarSesion, intento]);

  if (resultado) {
    return <FormularioEditarClase {...resultado} />;
  }

  return (
    <section className="page">
      <h1 className="page__title">Editar clase</h1>

      <div className="page__body profesores__feedback">
        {!idValido || error ? (
          <p className="message message--error" role="alert">
            {idValido ? error : "El identificador de la clase no es válido."}
          </p>
        ) : (
          <p role="status">Cargando clase…</p>
        )}

        {error && (
          <Button
            variant="secondary"
            onClick={() => {
              setError("");
              setIntento((actual) => actual + 1);
            }}
          >
            Reintentar
          </Button>
        )}

        <Button variant="secondary" onClick={() => navigate("/admin/clases")}>
          Regresar
        </Button>
      </div>
    </section>
  );
}

function FormularioEditarClase({ clase, catalogos }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [datos, setDatos] = useState({
    asignatura_id: clase.asignatura_id,
    grupo_id: clase.grupo_id,
    profesor_id: clase.profesor_id,
    activo: clase.activo,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function actualizarCampo(nombre, valor) {
    setDatos((actuales) => ({ ...actuales, [nombre]: valor }));
    setError("");
  }

  function obtenerCambios() {
    return Object.fromEntries(
      Object.entries(datos).filter(([campo, valor]) => valor !== clase[campo])
    );
  }

  function cancelar() {
    if (guardando) return;

    if (
      Object.keys(obtenerCambios()).length > 0 &&
      !window.confirm("¿Descartar los cambios de la clase?")
    ) {
      return;
    }

    navigate("/admin/clases");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    const cambios = obtenerCambios();

    if (Object.keys(cambios).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await editarClase({ claseId: clase.id, datos: cambios, token });

      navigate("/admin/clases", {
        replace: true,
        state: { mensaje: "Clase actualizada correctamente." },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setError(error.message || "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Editar clase</h1>
        <p className="page__description">
          Actualiza la asignatura, el grupo, el profesor o el estado.
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            {campos.map(({ nombre, etiqueta, catalogo }) => (
              <div className="field" key={nombre}>
                <label className="field__label" htmlFor={`editar-${nombre}`}>
                  {etiqueta}
                </label>
                <select
                  id={`editar-${nombre}`}
                  className="field__input"
                  value={datos[nombre]}
                  onChange={(evento) =>
                    actualizarCampo(nombre, Number(evento.target.value))
                  }
                  disabled={guardando}
                  required
                >
                  {catalogos[catalogo].map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="field">
              <label className="field__label" htmlFor="estado-clase">
                Estado de la clase
              </label>
              <select
                id="estado-clase"
                className="field__input"
                value={datos.activo ? "activa" : "inactiva"}
                onChange={(evento) =>
                  actualizarCampo("activo", evento.target.value === "activa")
                }
                disabled={guardando}
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>

            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <FormActions
          onCancel={cancelar}
          submitLabel="Guardar cambios"
          loading={guardando}
        />
      </form>
    </section>
  );
}
