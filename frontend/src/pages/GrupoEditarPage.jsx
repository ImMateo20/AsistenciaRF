import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import InputField from "../components/InputField";
import SelectorAlumnosGrupo from "../components/SelectorAlumnosGrupo";
import useAuth from "../context/useAuth";
import { listarAlumnosDisponibles } from "../services/alumnos";
import { ApiError } from "../services/api";
import { editarGrupo, obtenerGrupo } from "../services/grupos";

export default function GrupoEditarPage() {
  const { grupoId } = useParams();

  return <CargarGrupo key={grupoId} grupoId={grupoId} />;
}

function CargarGrupo({ grupoId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  const idValido = /^[1-9][0-9]*$/.test(grupoId ?? "");

  useEffect(() => {
    if (!idValido) return;

    const controlador = new AbortController();
    const signal = controlador.signal;

    Promise.all([
      obtenerGrupo({ grupoId, token, signal }),
      listarAlumnosDisponibles({
        token,
        signal,
        grupoId: Number(grupoId),
      }),
    ])
      .then(([grupo, alumnos]) => {
        if (!signal.aborted) {
          setResultado({ grupo, alumnos });
        }
      })
      .catch((error) => {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setError(
          error.message || "No se pudieron cargar el grupo y sus alumnos."
        );
      });

    return () => controlador.abort();
  }, [grupoId, idValido, token, intento, limpiarSesion]);

  if (resultado) {
    return (
      <FormularioGrupo grupo={resultado.grupo} alumnos={resultado.alumnos} />
    );
  }

  return (
    <section className="page">
      <h1 className="page__title">Editar grupo</h1>

      <div className="page__body profesores__feedback">
        {!idValido || error ? (
          <p className="message message--error" role="alert">
            {idValido ? error : "El identificador del grupo no es válido."}
          </p>
        ) : (
          <p role="status">Cargando grupo y alumnos…</p>
        )}

        {idValido && error && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError("");
              setIntento((actual) => actual + 1);
            }}
          >
            Reintentar
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/admin/grupos")}
        >
          Regresar
        </Button>
        
      </div>
    </section>
  );
}

function FormularioGrupo({ grupo, alumnos }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const alumnosOriginales = alumnos
    .filter((alumno) => alumno.grupo_id === grupo.id)
    .map((alumno) => alumno.id);

  const [nombre, setNombre] = useState(grupo.nombre);
  const [activo, setActivo] = useState(grupo.activo);
  const [alumnoIds, setAlumnoIds] = useState(alumnosOriginales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cambiarSeleccion(alumnoId, seleccionado) {
    setAlumnoIds((actuales) =>
      seleccionado
        ? [...actuales, alumnoId]
        : actuales.filter((id) => id !== alumnoId)
    );

    setError("");
  }

  function obtenerCambios() {
    const cambios = {};
    const nombreLimpio = nombre.trim();

    if (nombreLimpio !== grupo.nombre) cambios.nombre = nombreLimpio;
    if (activo !== grupo.activo) cambios.activo = activo;

    if (
      alumnoIds.length !== alumnosOriginales.length ||
      alumnosOriginales.some((id) => !alumnoIds.includes(id))
    ) {
      cambios.alumno_ids = alumnoIds;
    }

    return cambios;
  }

  function cancelar() {
    if (guardando) return;

    if (
      Object.keys(obtenerCambios()).length > 0 &&
      !window.confirm("¿Descartar los cambios del grupo?")
    ) {
      return;
    }

    navigate("/admin/grupos");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    if (!nombre.trim()) {
      setError("Introduce el nombre del grupo.");
      return;
    }

    const cambios = obtenerCambios();

    if (Object.keys(cambios).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await editarGrupo({ grupoId: grupo.id, datos: cambios, token });

      navigate("/admin/grupos", {
        replace: true,
        state: { mensaje: "Grupo actualizado correctamente." },
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
        <h1 className="page__title">Editar grupo</h1>
        <p className="page__description">
          Actualiza el nombre, el estado o los alumnos del grupo.
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            <InputField
              label="Nombre del grupo"
              name="nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={50}
              required
              disabled={guardando}
            />

            <div className="field">
              <label className="field__label" htmlFor="estado-grupo">
                Estado del grupo
              </label>

              <select
                id="estado-grupo"
                className="field__input"
                value={activo ? "activo" : "inactivo"}
                onChange={(evento) =>
                  setActivo(evento.target.value === "activo")
                }
                disabled={guardando}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <SelectorAlumnosGrupo
              alumnos={alumnos}
              alumnoIds={alumnoIds}
              onChange={cambiarSeleccion}
              disabled={guardando}
            />

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
