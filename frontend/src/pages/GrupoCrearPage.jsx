import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Button from "../components/Button";
import { listarAlumnosDisponibles } from "../services/alumnos";

import FormActions from "../components/FormActions";
import SelectorAlumnosGrupo from "../components/SelectorAlumnosGrupo";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { crearGrupo } from "../services/grupos";

export default function GrupoCrearPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [alumnos, setAlumnos] = useState(null);
  const [alumnoIds, setAlumnoIds] = useState([]);
  const [errorAlumnos, setErrorAlumnos] = useState("");
  const [intentoAlumnos, setIntentoAlumnos] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    const signal = controlador.signal;

    listarAlumnosDisponibles({ token, signal })
      .then((datos) => {
        if (!signal.aborted) setAlumnos(datos);
      })
      .catch((error) => {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setErrorAlumnos(error.message || "No se pudieron cargar los alumnos.");
      });

    return () => controlador.abort();
  }, [token, limpiarSesion, intentoAlumnos]);

  function cambiarSeleccion(alumnoId, seleccionado) {
    setAlumnoIds((actuales) =>
      seleccionado
        ? [...actuales, alumnoId]
        : actuales.filter((id) => id !== alumnoId)
    );
    setError("");
  }

  function cancelar() {
    if (guardando) return;

    if (
      (nombre.trim() || alumnoIds.length > 0) &&
      !window.confirm("¿Quieres salir sin guardar el grupo?")
    ) {
      return;
    }

    navigate("/admin/grupos");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando || alumnos === null) return;

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Introduce el nombre del grupo.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await crearGrupo({ nombre: nombreLimpio, alumnoIds, token });

      navigate("/admin/grupos", {
        replace: true,
        state: { mensaje: "Grupo creado correctamente." },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setError(error.message || "No se pudo crear el grupo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Crear grupo</h1>
        <p className="page__description">
          Escribe el nombre del grupo que quieres agregar.
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            <InputField
              label="Nombre del grupo"
              name="nombre"
              placeholder="Ej. 6° A"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={50}
              required
              disabled={guardando}
            />
            {alumnos === null && !errorAlumnos && (
              <p role="status">Cargando alumnos disponibles…</p>
            )}

            {errorAlumnos && (
              <div className="profesores__feedback">
                <p className="message message--error" role="alert">
                  {errorAlumnos}
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setErrorAlumnos("");
                    setIntentoAlumnos((intento) => intento + 1);
                  }}
                >
                  Reintentar
                </Button>
              </div>
            )}
            {alumnos !== null && (
              <SelectorAlumnosGrupo
                alumnos={alumnos}
                alumnoIds={alumnoIds}
                onChange={cambiarSeleccion}
                disabled={guardando}
              />
            )}
            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {alumnos !== null ? (
          <FormActions
            onCancel={cancelar}
            submitLabel="Crear grupo"
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
