import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import Button from "../components/Button";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import {
  listarAlumnosDeMiClase,
  listarMisClases,
} from "../services/clasesProfesor";

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const diasCortos = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function resumirHorarios(horarios, detalle = false) {
  if (horarios.length === 0) return "Sin horario registrado";

  const nombres = detalle ? dias : diasCortos;
  const porHora = new Map();

  for (const horario of horarios) {
    const inicio = horario.hora_inicio.slice(0, 5);
    const fin = horario.hora_fin.slice(0, 5);
    const hora = detalle ? `${inicio}–${fin}` : inicio;
    const dia = nombres[horario.dia_semana - 1];

    if (!porHora.has(hora)) porHora.set(hora, []);
    porHora.get(hora).push(dia);
  }

  return [...porHora]
    .map(([hora, diasDelBloque]) => `${diasDelBloque.join(" / ")} · ${hora}`)
    .join("; ");
}

export default function MisClasesPage({ modoAsistencia = false }) {
  const navigate = useNavigate();
  const { claseId } = useParams();
  const { token, limpiarSesion } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [intento, setIntento] = useState(0);

  const esDetalle = claseId !== undefined;
  const claveConsulta = `${claseId ?? "listado"}:${intento}`;

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    async function cargar() {
      try {
        const [clases, alumnos] = await Promise.all([
          listarMisClases({ token, signal }),
          esDetalle
            ? listarAlumnosDeMiClase({ claseId, token, signal })
            : Promise.resolve([]),
        ]);

        if (!signal.aborted) {
          setResultado({ claveConsulta, clases, alumnos, error: "" });
        }
      } catch (error) {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setResultado({
          claveConsulta,
          clases: [],
          alumnos: [],
          error: error.message || "No se pudo cargar la información.",
        });
      }
    }

    cargar();

    return () => controlador.abort();
  }, [token, limpiarSesion, claseId, esDetalle, claveConsulta]);

  // Al cambiar de clase, se oculta la lista anterior mientras llega la nueva.
  const consultaActual =
    resultado?.claveConsulta === claveConsulta ? resultado : null;
  const cargando = consultaActual === null;
  const error = consultaActual?.error ?? "";
  const clases = consultaActual?.clases ?? [];
  const alumnos = consultaActual?.alumnos ?? [];
  const claseSeleccionada = clases.find(
    (clase) => String(clase.id) === claseId
  );

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">
          {esDetalle
            ? "Detalle de clase"
            : modoAsistencia
            ? "Asistencias"
            : "Clases"}
        </h1>
        <p className="page__description">
          {esDetalle
            ? "Consulta el horario y los alumnos de esta clase."
            : "Consulta tus clases asignadas y sus horarios."}
        </p>
      </header>

      <div className="page__body" aria-busy={cargando}>
        {cargando && (
          <p role="status">
            {esDetalle ? "Cargando detalle de clase…" : "Cargando tus clases…"}
          </p>
        )}

        {error && (
          <div className="profesores__feedback">
            <p className="message message--error" role="alert">
              {error}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIntento((actual) => actual + 1)}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!cargando &&
          !error &&
          esDetalle &&
          (claseSeleccionada ? (
            <div className="mis-clases__detalle">
              <h2>{claseSeleccionada.asignatura}</h2>
              <p>
                Grupo {claseSeleccionada.grupo} ·{" "}
                {resumirHorarios(claseSeleccionada.horarios, true)}
              </p>
              {!claseSeleccionada.activo && <p>Clase inactiva</p>}

              {alumnos.length === 0 ? (
                <p>No hay alumnos asignados a este grupo.</p>
              ) : (
                <ul
                  className="mis-clases mis-clases__alumnos"
                  aria-label="Alumnos del grupo"
                >
                  {alumnos.map((alumno) => (
                    <li
                      key={alumno.id}
                      className="mis-clases__tarjeta mis-clases__alumno"
                    >
                      <strong>{alumno.nombre}</strong>
                      <span>{alumno.matricula}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p>No se encontró esta clase entre tus asignaciones.</p>
          ))}

        {!cargando &&
          !error &&
          !esDetalle &&
          (clases.length === 0 ? (
            <p>No tienes clases asignadas.</p>
          ) : (
            <div className="mis-clases">
              {clases.map((clase) => (
                <article key={clase.id} className="mis-clases__tarjeta">
                  <h2>
                    {clase.asignatura} · Grupo {clase.grupo}
                    {!clase.activo && <small>Inactiva</small>}
                  </h2>

                  <p>{resumirHorarios(clase.horarios)}</p>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={modoAsistencia && !clase.activo}
                    onClick={() =>
                      navigate(
                        modoAsistencia
                          ? `/profesor/asistencias/${clase.id}`
                          : `/profesor/clases/${clase.id}`
                      )
                    }
                  >
                    {modoAsistencia ? "Tomar asistencia" : "Consultar"}
                  </Button>
                </article>
              ))}
            </div>
          ))}
      </div>

      {esDetalle && (
        <footer className="page__actions mis-clases__regreso">
          <Button
            type="button"
            variant="secondary"
            aria-label="Volver a clases"
            onClick={() => navigate("/profesor/clases")}
          >
            <ArrowLeft size={24} strokeWidth={2.5} aria-hidden="true" />
          </Button>
        </footer>
      )}
    </section>
  );
}
