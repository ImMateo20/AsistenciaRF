import { useState } from "react";
import { useNavigate } from "react-router";

import FormActions from "../components/FormActions";
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

  function cancelar() {
    if (guardando) return;

    if (
      nombre.trim() &&
      !window.confirm("¿Quieres salir sin guardar el grupo?")
    ) {
      return;
    }

    navigate("/admin/grupos");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Introduce el nombre del grupo.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await crearGrupo({ nombre: nombreLimpio, token });

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

            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <FormActions
          onCancel={cancelar}
          submitLabel="Crear grupo"
          loading={guardando}
        />
      </form>
    </section>
  );
}
