import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import {
  crearAsignatura,
  editarAsignatura,
  obtenerAsignatura,
} from "../services/asignaturas";

export default function AsignaturaFormularioPage() {
  const { asignaturaId } = useParams();

  return asignaturaId ? (
    <CargarAsignatura key={asignaturaId} asignaturaId={asignaturaId} />
  ) : (
    <FormularioAsignatura key="crear" />
  );
}

function CargarAsignatura({ asignaturaId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const [asignatura, setAsignatura] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  const idValido = /^[1-9][0-9]*$/.test(asignaturaId);

  useEffect(() => {
    if (!idValido) return;

    const controlador = new AbortController();

    obtenerAsignatura({
      asignaturaId,
      token,
      signal: controlador.signal,
    })
      .then((datos) => {
        if (!controlador.signal.aborted) setAsignatura(datos);
      })
      .catch((fallo) => {
        if (controlador.signal.aborted) return;

        if (fallo instanceof ApiError && fallo.status === 401) {
          limpiarSesion();
          return;
        }

        setError(fallo.message || "No se pudo cargar la asignatura.");
      });

    return () => controlador.abort();
  }, [asignaturaId, idValido, token, intento, limpiarSesion]);

  if (!idValido || error) {
    return (
      <section className="page">
        <h1 className="page__title">Editar asignatura</h1>

        <div className="page__body profesores__feedback">
          <p className="message message--error" role="alert">
            {idValido
              ? error
              : "El identificador de la asignatura no es válido."}
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
            onClick={() => navigate("/admin/asignaturas")}
          >
            Regresar
          </Button>
        </div>
      </section>
    );
  }

  if (!asignatura) return <p role="status">Cargando asignatura…</p>;

  return <FormularioAsignatura asignatura={asignatura} />;
}

function FormularioAsignatura({ asignatura }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const editando = Boolean(asignatura);

  const [datos, setDatos] = useState({
    clave: asignatura?.clave ?? "",
    nombre: asignatura?.nombre ?? "",
    activo: asignatura?.activo ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setDatos((actuales) => ({ ...actuales, [name]: value }));
  }

  function obtenerDatosLimpios() {
    return {
      clave: datos.clave.trim(),
      nombre: datos.nombre.trim(),
      activo: datos.activo,
    };
  }

  function obtenerCambios(actuales) {
    return Object.fromEntries(
      Object.entries(actuales).filter(
        ([campo, valor]) => valor !== asignatura[campo]
      )
    );
  }

  function cancelar() {
    if (guardando) return;

    const actuales = obtenerDatosLimpios();
    const hayCambios = editando
      ? Object.keys(obtenerCambios(actuales)).length > 0
      : Boolean(actuales.clave || actuales.nombre);

    if (
      hayCambios &&
      !window.confirm("¿Descartar los cambios del formulario?")
    ) {
      return;
    }

    navigate("/admin/asignaturas");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    setError("");
    const actuales = obtenerDatosLimpios();

    if (!actuales.clave || !actuales.nombre) {
      setError("Completa la clave y el nombre.");
      return;
    }

    const cambios = editando ? obtenerCambios(actuales) : null;

    if (editando && Object.keys(cambios).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setGuardando(true);

    try {
      if (editando) {
        await editarAsignatura({
          asignaturaId: asignatura.id,
          datos: cambios,
          token,
        });
      } else {
        await crearAsignatura({
          clave: actuales.clave,
          nombre: actuales.nombre,
          token,
        });
      }

      navigate("/admin/asignaturas", {
        replace: true,
        state: {
          mensaje: editando
            ? "Asignatura actualizada correctamente."
            : "Asignatura creada correctamente.",
        },
      });
    } catch (fallo) {
      if (fallo instanceof ApiError && fallo.status === 401) {
        limpiarSesion();
        return;
      }

      setError(fallo.message || "No se pudo guardar la asignatura.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">
          {editando ? "Editar asignatura" : "Crear asignatura"}
        </h1>
        <p className="page__description">
          {editando
            ? "Actualiza la información de la asignatura."
            : "Ingresa la clave y el nombre de la asignatura."}
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            <InputField
              label="Clave"
              name="clave"
              placeholder="Ej. PLN01"
              value={datos.clave}
              onChange={actualizarCampo}
              maxLength={30}
              required
              disabled={guardando}
            />

            <InputField
              label="Nombre"
              name="nombre"
              value={datos.nombre}
              onChange={actualizarCampo}
              maxLength={150}
              required
              disabled={guardando}
            />

            {editando && (
              <div className="field">
                <label className="field__label" htmlFor="estado-asignatura">
                  Estado
                </label>
                <select
                  id="estado-asignatura"
                  className="field__input"
                  value={datos.activo ? "activa" : "inactiva"}
                  onChange={(evento) =>
                    setDatos((actuales) => ({
                      ...actuales,
                      activo: evento.target.value === "activa",
                    }))
                  }
                  disabled={guardando}
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            )}

            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <FormActions
          onCancel={cancelar}
          submitLabel={editando ? "Guardar cambios" : "Crear asignatura"}
          loading={guardando}
        />
      </form>
    </section>
  );
}
