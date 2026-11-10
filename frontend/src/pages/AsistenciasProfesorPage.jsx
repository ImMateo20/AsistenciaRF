import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import { mostrarHoraLocal } from "../utils/fechas";
import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import {
  listarAsistenciasProfesor,
  obtenerDetalleAsistencia,
} from "../services/asistenciaProfesor";
import {
  listarAsistenciasAdmin,
  obtenerDetalleAsistenciaAdmin,
} from "../services/asistenciaAdmin";

export default function AsistenciasProfesorPage({ administrador = false }) {
  const { sesionId } = useParams();

  return (
    <VistaAsistencias
      key={`${administrador ? "admin" : "profesor"}-${sesionId ?? "historial"}`}
      sesionId={sesionId}
      administrador={administrador}
    />
  );
}

function VistaAsistencias({ sesionId, administrador }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();
  const rutaBase = administrador
    ? "/admin/asistencias"
    : "/profesor/asistencias";
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [clase, setClase] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;
    const listar = administrador
      ? listarAsistenciasAdmin
      : listarAsistenciasProfesor;

    const consultarDetalle = administrador
      ? obtenerDetalleAsistenciaAdmin
      : obtenerDetalleAsistencia;

    const consulta = sesionId
      ? consultarDetalle({ sesionId, token, signal })
      : listar({ token, signal });

    consulta
      .then((respuesta) => {
        if (!signal.aborted) setDatos(respuesta);
      })
      .catch((error) => {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setError(error.message || "No se pudo cargar la asistencia.");
      });

    return () => controlador.abort();
  }, [sesionId, administrador, token, limpiarSesion, intento]);

  const historial = !sesionId && datos ? datos : [];
  const clases = new Map(
    historial.map((sesion) => [
      sesion.clase_id,
      `${sesion.asignatura} · Grupo ${sesion.grupo}`,
    ])
  );
  const sesiones = historial.filter((sesion) => {
    const fecha = sesion.fecha_inicio.slice(0, 10);
    return (
      (!clase || String(sesion.clase_id) === clase) &&
      (!desde || fecha >= desde) &&
      (!hasta || fecha <= hasta)
    );
  });

  const alumnos = sesionId && datos ? datos.alumnos : [];
  const presentes = alumnos.filter((alumno) => alumno.fecha_registro).length;
  const porcentaje = alumnos.length
    ? Math.round((presentes / alumnos.length) * 100)
    : 0;

  return (
    <section className="page page--listado">
      <header>
        <h1 className="page__title">
          {sesionId ? "Detalle de asistencia" : "Asistencias"}
        </h1>
        <p className="page__description">
          {administrador
            ? "Consulta las asistencias registradas por los profesores y sus detalles."
            : "Registra y consulta las asistencias de tus clases."}
        </p>
      </header>

      <div className="page__body">
        {!datos && !error && <p role="status">Cargando asistencias…</p>}

        {error && (
          <>
            <p className="message message--error" role="alert">
              {error}
            </p>
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
          </>
        )}

        {datos && !sesionId && (
          <>
            <div className="asistencias-profesor__filtros">
              <label className="field">
                <span className="field__label">Clase</span>
                <select
                  className="field__input"
                  value={clase}
                  onChange={(evento) => setClase(evento.target.value)}
                >
                  <option value="">
                    {administrador ? "Todas las clases" : "Mis clases"}
                  </option>
                  {[...clases].map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Desde</span>
                <input
                  className="field__input"
                  type="date"
                  value={desde}
                  onChange={(evento) => setDesde(evento.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Hasta</span>
                <input
                  className="field__input"
                  type="date"
                  value={hasta}
                  onChange={(evento) => setHasta(evento.target.value)}
                />
              </label>
            </div>

            {sesiones.length === 0 && <p>No hay sesiones para mostrar.</p>}

            <div className="mis-clases">
              {sesiones.map((sesion) => (
                <article className="mis-clases__tarjeta" key={sesion.id}>
                  <h2>
                    {sesion.asignatura} · Grupo {sesion.grupo}
                  </h2>
                  <p>
                    {sesion.fecha_inicio
                      .slice(0, 10)
                      .split("-")
                      .reverse()
                      .join("/")}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(`${rutaBase}/sesiones/${sesion.id}`)
                    }
                  >
                    Consultar
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}

        {datos && sesionId && (
          <div className="asistencias-profesor__detalle">
            <div className="mis-clases">
              <h2>
                {datos.asignatura} · Grupo {datos.grupo} ·{" "}
                {datos.fecha_inicio.slice(0, 10).split("-").reverse().join("/")}
              </h2>

              {alumnos.length === 0 && <p>No hay alumnos para mostrar.</p>}

              {alumnos.map((alumno) => (
                <article
                  className="asistencias-profesor__alumno"
                  key={alumno.id}
                >
                  <strong>{alumno.nombre}</strong>
                  <span
                    className={`asistencia-estado ${
                      alumno.fecha_registro
                        ? "asistencia-estado--presente"
                        : datos.estado === "cerrada"
                        ? "asistencia-estado--falta"
                        : "asistencia-estado--pendiente"
                    }`}
                  >
                    {alumno.fecha_registro
                      ? "Presente"
                      : datos.estado === "cerrada"
                      ? "Falta"
                      : "Pendiente"}
                  </span>
                  <span>{mostrarHoraLocal(alumno.fecha_registro)}</span>
                </article>
              ))}
            </div>

            <Card className="asistencias-profesor__resumen">
              <strong>Asistencia de la sesión</strong>
              <div
                className="asistencias-profesor__anillo"
                style={{ "--porcentaje": `${porcentaje}%` }}
              >
                <span>{alumnos.length ? `${porcentaje} %` : "—"}</span>
              </div>
              <p>
                {presentes} presentes · {alumnos.length - presentes}{" "}
                {datos.estado === "cerrada" ? "faltas" : "pendientes"}
              </p>
              <p>
                {datos.estado === "cerrada"
                  ? "Sesión finalizada"
                  : "Sesión en curso"}
              </p>
            </Card>
          </div>
        )}
      </div>

      {sesionId ? (
        <footer className="page__actions mis-clases__regreso">
          <Button
            type="button"
            variant="secondary"
            aria-label="Volver a asistencias"
            onClick={() => navigate(rutaBase)}
          >
            <ArrowLeft size={24} strokeWidth={2.5} aria-hidden="true" />
          </Button>
        </footer>
      ) : !administrador ? (
        <footer className="page__actions">
          <Button
            type="button"
            onClick={() => navigate("/profesor/asistencias/tomar")}
          >
            Tomar asistencia
          </Button>
        </footer>
      ) : null}
    </section>
  );
}
