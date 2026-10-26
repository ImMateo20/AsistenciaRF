import { useState } from "react";
import { useNavigate } from "react-router";

import FormActions from "../components/FormActions";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { registrarProfesor } from "../services/profesores";

export default function ProfesorCrearPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [datos, setDatos] = useState({
    nombre: "",
    matricula: "",
    correo: "",
    password: "",
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

  function cancelar() {
    const hayCambios = Object.values(datos).some((valor) => valor.length > 0);

    if (hayCambios && !window.confirm("¿Descartar los datos del formulario?")) {
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

    setLoading(true);
    setError("");

    try {
      await registrarProfesor(token, {
        nombre: datos.nombre.trim(),
        matricula: datos.matricula.trim(),
        correo: datos.correo.trim(),
        password: datos.password,
      });

      navigate("/admin/profesores", {
        replace: true,
        state: {
          mensaje: "Profesor registrado correctamente.",
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setError(error.message || "No se pudo registrar al profesor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Registrar profesor</h1>

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
              autoComplete="name"
              placeholder="Escribe el nombre"
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
              placeholder="Ej. 1020349"
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
              autoComplete="off"
              placeholder="correo@ejemplo.com"
              value={datos.correo}
              onChange={actualizarCampo}
              maxLength={254}
              required
              disabled={loading}
            />

            <InputField
              label="Contraseña inicial"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Entre 12 y 128 caracteres"
              value={datos.password}
              onChange={actualizarCampo}
              minLength={12}
              maxLength={128}
              required
              disabled={loading}
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
          submitLabel="Registrar profesor"
          loading={loading}
        />
      </form>
    </section>
  );
}
