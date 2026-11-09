import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import Card from "../components/Card";
import Button from "../components/Button";
import FormActions from "../components/FormActions";
import HorariosClaseFields from "../components/HorariosClaseFields";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { consultarCatalogosClases } from "../services/catalogosClases";
import { crearClase } from "../services/clases";

const campos = [
  { nombre: "asignatura_id", etiqueta: "Asignatura", catalogo: "asignaturas" },
  { nombre: "grupo_id", etiqueta: "Grupo", catalogo: "grupos" },
  { nombre: "profesor_id", etiqueta: "Profesor", catalogo: "profesores" },
];

function crearBloqueVacio(clave) {
  return { clave, dia_semana: 1, hora_inicio: "", hora_fin: "" };
}

function hayTraslapes(horarios) {
  const ordenados = [...horarios].sort(
    (a, b) =>
      a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio)
  );

  return ordenados.some((bloque, indice) => {
    const anterior = ordenados[indice - 1];

    return (
      anterior &&
      anterior.dia_semana === bloque.dia_semana &&
      bloque.hora_inicio < anterior.hora_fin
    );
  });
}

export default function ClaseCrearPage() {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [seleccion, setSeleccion] = useState({});
  const [catalogos, setCatalogos] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [bloques, setBloques] = useState(() => [crearBloqueVacio(1)]);
  const siguienteClave = useRef(2);

  useEffect(() => {
    const controlador = new AbortController();
    const signal = controlador.signal;

    consultarCatalogosClases({ token, signal })
      .then((datos) => {
        if (!signal.aborted) setCatalogos(datos);
      })
      .catch((error) => {
        if (signal.aborted) return;

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
  const formularioListo = catalogos !== null && faltantes.length === 0;

  function agregarHorario() {
    const clave = siguienteClave.current;
    siguienteClave.current += 1;

    setBloques((actuales) => [...actuales, crearBloqueVacio(clave)]);
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

  function cancelar() {
    if (guardando) return;

    const hayCambios =
      Object.values(seleccion).some(Boolean) ||
      bloques.length > 1 ||
      bloques.some(
        ({ dia_semana, hora_inicio, hora_fin }) =>
          dia_semana !== 1 || hora_inicio || hora_fin
      );

    if (hayCambios && !window.confirm("¿Quieres salir sin guardar la clase?")) {
      return;
    }

    navigate("/admin/clases");
  }

  async function guardar(evento) {
    evento.preventDefault();

    if (guardando || !formularioListo) return;

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

    const horarios = bloques.map(({ dia_semana, hora_inicio, hora_fin }) => ({
      dia_semana,
      hora_inicio,
      hora_fin,
    }));

    if (
      horarios.some(
        ({ hora_inicio, hora_fin }) =>
          !hora_inicio || !hora_fin || hora_fin <= hora_inicio
      )
    ) {
      setError(
        "Completa los horarios. La hora de fin debe ser posterior al inicio."
      );
      return;
    }

    if (hayTraslapes(horarios)) {
      setError("Dos horarios de esta clase se cruzan el mismo día.");
      return;
    }

    datos.bloques = horarios;
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
    <section className="page page--formulario">
      <header>
        <h1 className="page__title">Crear clase</h1>
        <p className="page__description">
          Selecciona la asignatura, el grupo y el profesor, y agrega los
          horarios.
        </p>
      </header>

      <form
        className="profesor-form"
        onSubmit={guardar}
        aria-busy={cargando || guardando}
      >
        <div className="page__body">
          <div className="clase-crear__contenido">
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

            {catalogos && (
              <div className="clase-crear__tarjetas">
                {[campos.slice(0, 2), campos.slice(2)].map(
                  (camposTarjeta, indice) => (
                    <Card className="clase-crear__tarjeta" key={indice}>
                      {camposTarjeta.map(({ nombre, etiqueta, catalogo }) => (
                        <div className="field" key={nombre}>
                          <label
                            className="field__label"
                            htmlFor={`clase-${nombre}`}
                          >
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
                            disabled={
                              guardando || catalogos[catalogo].length === 0
                            }
                            required
                          >
                            <option value="">
                              Seleccionar {etiqueta.toLowerCase()}
                            </option>

                            {catalogos[catalogo].map((opcion) => (
                              <option key={opcion.id} value={opcion.id}>
                                {opcion.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </Card>
                  )
                )}
              </div>
            )}

            {formularioListo && (
              <HorariosClaseFields
                bloques={bloques}
                onAgregar={agregarHorario}
                onCambiar={cambiarHorario}
                onQuitar={quitarHorario}
                disabled={guardando}
              />
            )}
            {formularioListo && (
              <aside className="clase-crear__aviso">
                <h2>Evita cruces de horario</h2>
                <p>
                  Al guardar, se revisará que los horarios no coincidan con otra
                  clase del mismo grupo.
                </p>
              </aside>
            )}
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

        {formularioListo ? (
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
