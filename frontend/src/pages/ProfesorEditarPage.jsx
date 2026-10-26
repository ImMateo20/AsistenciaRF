import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import FormActions from "../components/FormActions";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarProfesor, editarProfesor } from "../services/profesores";

export default function ProfesorEditarPage() {
  const { profesorId } = useParams();
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [carga, setCarga] = useState({
    estado: "loading",
    profesor: null,
    error: "",
  });

  const [intento, setIntento] = useState(0);

  const idValido = /^[1-9][0-9]*$/.test(profesorId ?? "");

  useEffect(() => {
    if (!idValido) {
      return;
    }

    const controlador = new AbortController();

    consultarProfesor(token, profesorId, controlador.signal)
      .then((profesor) => {
        if (!controlador.signal.aborted) {
          setCarga({
            estado: "success",
            profesor,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (controlador.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setCarga({
          estado: "error",
          profesor: null,
          error: error.message || "No se pudo cargar al profesor.",
        });
      });

    return () => controlador.abort();
  }, [token, profesorId, idValido, intento, limpiarSesion]);

  function reintentar() {
    setCarga({
      estado: "loading",
      profesor: null,
      error: "",
    });

    setIntento((actual) => actual + 1);
  }

  if (!idValido) {
    return (
      <section className="page">
        <h1 className="page__title">Profesor no válido</h1>

        <Button
          variant="secondary"
          onClick={() => navigate("/admin/profesores")}
        >
          Regresar
        </Button>
      </section>
    );
  }

  if (carga.estado === "loading") {
    return <p role="status">Cargando profesor…</p>;
  }

  if (carga.estado === "error") {
    return (
      <section className="page">
        <h1 className="page__title">Editar profesor</h1>

        <div className="page__body profesores__feedback">
          <p className="message message--error" role="alert">
            {carga.error}
          </p>

          <Button variant="secondary" onClick={reintentar}>
            Reintentar
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/admin/profesores")}
          >
            Regresar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <FormularioEditarProfesor key={profesorId} profesor={carga.profesor} />
  );
}

function FormularioEditarProfesor({ profesor }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [datos, setDatos] = useState({
    nombre: profesor.nombre,
    matricula: profesor.matricula,
    correo: profesor.correo,
    activo: profesor.activo,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function actualizarCampo(event) {
    const { name, value } = event.target;

    setDatos((actuales) => ({
      ...actuales,
      [name]: value,
    }));
  }

  function obtenerCambios() {
    const actuales = {
      nombre: datos.nombre.trim(),
      matricula: datos.matricula.trim(),
      correo: datos.correo.trim().toLowerCase(),
      activo: datos.activo,
    };

    const originales = {
      nombre: profesor.nombre,
      matricula: profesor.matricula,
      correo: profesor.correo.toLowerCase(),
      activo: profesor.activo,
    };

    return Object.fromEntries(
      Object.entries(actuales).filter(
        ([campo, valor]) => valor !== originales[campo]
      )
    );
  }

  function cancelar() {
    if (
      Object.keys(obtenerCambios()).length > 0 &&
      !window.confirm("¿Descartar los cambios del formulario?")
    ) {
      return;
    }

    navigate("/admin/profesores");
  }

  async function guardar(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!datos.nombre.trim()) {
      setError("Introduce el nombre del profesor.");
      return;
    }

    const cambios = obtenerCambios();

    if (Object.keys(cambios).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await editarProfesor(token, profesor.id, cambios);

      navigate("/admin/profesores", {
        replace: true,
        state: {
          mensaje: "Profesor actualizado correctamente.",
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setError(error.message || "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Editar profesor</h1>

        <p className="page__description">
          Gestiona la información de tu institución.
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={loading}>
        <div className="page__body">
          <div className="form-fields profesor-form__fields">
            <InputField
              label="Nombre completo"
              name="nombre"
              value={datos.nombre}
              onChange={actualizarCampo}
              maxLength={150}
              required
              disabled={loading}
            />

            <InputField
              label="Matrícula"
              name="matricula"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              title="Utiliza únicamente números."
              value={datos.matricula}
              onChange={actualizarCampo}
              maxLength={20}
              required
              disabled={loading}
            />

            <InputField
              label="Correo"
              name="correo"
              type="email"
              value={datos.correo}
              onChange={actualizarCampo}
              maxLength={254}
              required
              disabled={loading}
            />

            <div className="field">
              <label className="field__label" htmlFor="estado-profesor">
                Estado de la cuenta
              </label>

              <select
                id="estado-profesor"
                className="field__input"
                value={datos.activo ? "activo" : "inactivo"}
                onChange={(event) =>
                  setDatos((actuales) => ({
                    ...actuales,
                    activo: event.target.value === "activo",
                  }))
                }
                disabled={loading}
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
          loading={loading}
        />
      </form>
    </section>
  );
}
