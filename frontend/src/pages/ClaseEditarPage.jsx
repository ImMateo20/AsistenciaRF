import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Card from "../components/Card";
import HorariosClaseFields from "../components/HorariosClaseFields";
import Button from "../components/Button";
import FormActions from "../components/FormActions";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarCatalogosClases } from "../services/catalogosClases";
import {
  editarClase,
  obtenerClase,
  obtenerHorariosClase,
} from "../services/clases";

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
      obtenerHorariosClase({ claseId, token, signal }),
    ])
      .then(([clase, catalogos, horarios]) => {
        if (!signal.aborted) setResultado({ clase, catalogos, horarios });
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

        {(!idValido || error) && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/admin/clases")}
          >
            Regresar
          </Button>
        )}
      </div>
    </section>
  );
}

function FormularioEditarClase({ clase, catalogos, horarios }) {
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

  const [bloques, setBloques] = useState(() =>
    horarios.map((horario) => ({
      clave: horario.id,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
    }))
  );

  const siguienteClave = useRef(-1);

  function agregarHorario() {
    const clave = siguienteClave.current;
    siguienteClave.current -= 1;

    setBloques((actuales) => [
      ...actuales,
      { clave, dia_semana: 1, hora_inicio: "", hora_fin: "" },
    ]);
    setError("");
  }

  function cambiarHorario(clave, campo, valor) {
    setBloques((actuales) =>
      actuales.map((bloque) =>
        bloque.clave === clave ? { ...bloque, [campo]: valor } : bloque
      )
    );
    setError("");
  }

  function quitarHorario(clave) {
    setBloques((actuales) =>
      actuales.length > 1
        ? actuales.filter((bloque) => bloque.clave !== clave)
        : actuales
    );
    setError("");
  }

  function datosHorario({ dia_semana, hora_inicio, hora_fin }) {
    const normalizar = (hora) => (hora.length === 5 ? `${hora}:00` : hora);

    return {
      dia_semana,
      hora_inicio: normalizar(hora_inicio),
      hora_fin: normalizar(hora_fin),
    };
  }

  function actualizarCampo(nombre, valor) {
    setDatos((actuales) => ({ ...actuales, [nombre]: valor }));
    setError("");
  }

  function obtenerCambios() {
    const cambios = Object.fromEntries(
      Object.entries(datos).filter(([campo, valor]) => valor !== clase[campo])
    );

    const horariosNuevos = bloques.map(datosHorario);
    const horariosOriginales = horarios.map(datosHorario);

    if (JSON.stringify(horariosNuevos) !== JSON.stringify(horariosOriginales)) {
      cambios.bloques = horariosNuevos;
    }

    return cambios;
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

    if (cambios.bloques) {
      const ordenados = [...cambios.bloques].sort(
        (a, b) =>
          a.dia_semana - b.dia_semana ||
          a.hora_inicio.localeCompare(b.hora_inicio)
      );

      if (
        ordenados.length === 0 ||
        ordenados.some(
          ({ hora_inicio, hora_fin }) =>
            !hora_inicio || !hora_fin || hora_fin <= hora_inicio
        )
      ) {
        setError(
          "Completa los horarios. La hora de fin debe ser posterior al inicio."
        );
        return;
      }

      if (
        ordenados.some((bloque, indice) => {
          const anterior = ordenados[indice - 1];

          return (
            anterior &&
            anterior.dia_semana === bloque.dia_semana &&
            bloque.hora_inicio < anterior.hora_fin
          );
        })
      ) {
        setError("Dos horarios de esta clase se cruzan el mismo día.");
        return;
      }
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
    <section className="page page--formulario">
      <header>
        <h1 className="page__title">Editar clase</h1>
        <p className="page__description">
          Actualiza la asignatura, el grupo, el profesor o el estado.
        </p>
      </header>

      <form className="profesor-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body">
          <div className="clase-crear__contenido">
            <div className="clase-crear__tarjetas">
              {[campos.slice(0, 2), campos.slice(2)].map(
                (camposTarjeta, indice) => (
                  <Card className="clase-crear__tarjeta" key={indice}>
                    {camposTarjeta.map(({ nombre, etiqueta, catalogo }) => (
                      <div className="field" key={nombre}>
                        <label
                          className="field__label"
                          htmlFor={`editar-${nombre}`}
                        >
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

                    {indice === 1 && (
                      <div className="field">
                        <label className="field__label" htmlFor="estado-clase">
                          Estado de la clase
                        </label>

                        <select
                          id="estado-clase"
                          className="field__input"
                          value={datos.activo ? "activa" : "inactiva"}
                          onChange={(evento) =>
                            actualizarCampo(
                              "activo",
                              evento.target.value === "activa"
                            )
                          }
                          disabled={guardando}
                        >
                          <option value="activa">Activa</option>
                          <option value="inactiva">Inactiva</option>
                        </select>
                      </div>
                    )}
                  </Card>
                )
              )}
            </div>

            <HorariosClaseFields
              bloques={bloques}
              onAgregar={agregarHorario}
              onCambiar={cambiarHorario}
              onQuitar={quitarHorario}
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
