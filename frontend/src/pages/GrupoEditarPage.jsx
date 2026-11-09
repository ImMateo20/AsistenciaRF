import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { editarGrupo, obtenerGrupo } from "../services/grupos";

export default function GrupoEditarPage() {
  const { grupoId } = useParams();

  return <CargarGrupo key={grupoId} grupoId={grupoId} />;
}

function CargarGrupo({ grupoId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const [grupo, setGrupo] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const idValido = /^[1-9][0-9]*$/.test(grupoId ?? "");

  useEffect(() => {
    if (!idValido) return;

    const controlador = new AbortController();

    obtenerGrupo({ grupoId, token, signal: controlador.signal })
      .then((datos) => {
        if (!controlador.signal.aborted) setGrupo(datos);
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setError(error.message || "No se pudo cargar el grupo.");
      });

    return () => controlador.abort();
  }, [grupoId, idValido, token, intento, limpiarSesion]);

  if (grupo) return <FormularioGrupo grupo={grupo} />;

  return (
    <section className="page">
      <h1 className="page__title">Editar grupo</h1>

      {!idValido || error ? (
        <div className="page__body profesores__feedback">
          <p className="message message--error" role="alert">
            {idValido ? error : "El identificador del grupo no es válido."}
          </p>

          {idValido && (
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

          <Button
            variant="secondary"
            onClick={() => navigate("/admin/grupos")}
          >
            Regresar
          </Button>
        </div>
      ) : (
        <p role="status">Cargando grupo…</p>
      )}
    </section>
  );
}

function FormularioGrupo({ grupo }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const [nombre, setNombre] = useState(grupo.nombre);
  const [activo, setActivo] = useState(grupo.activo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function obtenerCambios() {
    const cambios = {};

    if (nombre.trim() !== grupo.nombre) cambios.nombre = nombre.trim();
    if (activo !== grupo.activo) cambios.activo = activo;

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
          Actualiza el nombre o el estado del grupo.
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
                onChange={(evento) => setActivo(evento.target.value === "activo")}
                disabled={guardando}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
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