import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ScanFace } from "lucide-react";

import { mostrarHoraLocal } from "../utils/fechas";

import Button from "../components/Button";
import Card from "../components/Card";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import {
  abrirSesionAsistencia,
  cerrarSesionAsistencia,
  obtenerDetalleAsistencia,
  reconocerAlumno,
} from "../services/asistenciaProfesor";

function detenerFlujo(flujo) {
  flujo?.getTracks().forEach((pista) => pista.stop());
}

function capturarImagen(video) {
  const lienzo = document.createElement("canvas");
  const escala = Math.min(
    1,
    1280 / Math.max(video.videoWidth, video.videoHeight)
  );

  lienzo.width = Math.max(1, Math.round(video.videoWidth * escala));
  lienzo.height = Math.max(1, Math.round(video.videoHeight * escala));

  const contexto = lienzo.getContext("2d");

  if (!contexto) {
    throw new Error("No se pudo preparar la captura.");
  }

  contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (imagen) => {
        if (imagen) {
          resolve(imagen);
        } else {
          reject(new Error("No se pudo generar la captura."));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function TomarAsistenciaPage() {
  const { claseId } = useParams();

  return <SesionAsistencia key={claseId} claseId={claseId} />;
}

function SesionAsistencia({ claseId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const videoRef = useRef(null);
  const flujoRef = useRef(null);
  const solicitudCamara = useRef(0);

  const [sesion, setSesion] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [operacion, setOperacion] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState("");
  const [revisionResumen, setRevisionResumen] = useState(0);

  const sesionId = sesion?.id;
  const sesionAbierta = sesion?.estado === "abierta";
  const ocupado = operacion !== "";

  const presentes =
    resumen?.alumnos.filter((alumno) => alumno.fecha_registro) ?? [];

  useEffect(() => {
    if (!sesionId || !sesionAbierta) return;

    const controlador = new AbortController();
    const { signal } = controlador;

    obtenerDetalleAsistencia({ sesionId, token, signal })
      .then((datos) => {
        if (signal.aborted) return;

        setResumen(datos);
        setErrorResumen("");
      })
      .catch((error) => {
        if (signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setErrorResumen(error.message || "No se pudo actualizar la lista.");
      });

    return () => controlador.abort();
  }, [sesionId, sesionAbierta, token, limpiarSesion, revisionResumen]);

  useEffect(() => {
    return () => {
      solicitudCamara.current += 1;
      detenerFlujo(flujoRef.current);
      flujoRef.current = null;
    };
  }, []);

  function apagarCamara() {
    solicitudCamara.current += 1;
    detenerFlujo(flujoRef.current);
    flujoRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCamaraActiva(false);
  }

  function mostrarError(error, respaldo) {
    if (error instanceof ApiError && error.status === 401) {
      apagarCamara();
      limpiarSesion();
      return;
    }

    setError(error.message || respaldo);
  }

  async function abrir() {
    if (ocupado) return;

    setOperacion("abriendo");
    setError("");
    setResultado(null);

    try {
      const respuesta = await abrirSesionAsistencia({ claseId, token });
      setSesion(respuesta);
    } catch (error) {
      mostrarError(error, "No se pudo abrir la sesión.");
    } finally {
      setOperacion("");
    }
  }

  async function activarCamara() {
    if (!sesionAbierta || ocupado) return;

    const solicitud = ++solicitudCamara.current;

    setOperacion("camara");
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("La cámara necesita una conexión HTTPS o localhost.");
      }

      const flujo = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      const video = videoRef.current;

      if (solicitud !== solicitudCamara.current || !video) {
        detenerFlujo(flujo);
        return;
      }

      flujoRef.current = flujo;
      video.srcObject = flujo;
      await video.play();

      if (solicitud === solicitudCamara.current) {
        setCamaraActiva(true);
      }
    } catch (error) {
      if (solicitud !== solicitudCamara.current) return;

      apagarCamara();

      if (error.name === "NotAllowedError") {
        setError("Permite el acceso a la cámara desde tu navegador.");
      } else if (error.name === "NotFoundError") {
        setError("No se encontró una cámara disponible.");
      } else {
        setError(error.message || "No se pudo activar la cámara.");
      }
    } finally {
      setOperacion("");
    }
  }

  async function registrar() {
    const video = videoRef.current;

    if (!sesionAbierta || !camaraActiva || !video || ocupado) return;

    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError("Espera a que la cámara muestre la imagen.");
      return;
    }

    setOperacion("reconociendo");
    setError("");
    setResultado(null);

    try {
      const imagen = await capturarImagen(video);
      const respuesta = await reconocerAlumno({
        claseId,
        sesionId,
        imagen,
        token,
      });

      setResultado(respuesta);

      if (
        respuesta.estado === "registrada" ||
        respuesta.estado === "ya_registrada"
      ) {
        setRevisionResumen((actual) => actual + 1);
      }
    } catch (error) {
      mostrarError(error, "No se pudo reconocer la captura.");
    } finally {
      setOperacion("");
    }
  }

  async function cerrar() {
    if (!sesionAbierta || ocupado) return;

    setOperacion("cerrando");
    setError("");

    try {
      const respuesta = await cerrarSesionAsistencia({
        claseId,
        sesionId,
        token,
      });

      setSesion(respuesta);
      apagarCamara();
      navigate(`/profesor/asistencias/sesiones/${respuesta.id}`, {
        replace: true,
      });
    } catch (error) {
      mostrarError(error, "No se pudo cerrar la sesión.");
    } finally {
      setOperacion("");
    }
  }

  const nombreClase = resumen
    ? `${resumen.asignatura} · Grupo ${resumen.grupo}`
    : `Clase ${claseId}`;

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Tomar asistencia</h1>
        <p className="page__description">
          Abre una sesión de clase y registra a los alumnos inscritos.
        </p>
      </header>

      <div className="page__body toma-asistencia" aria-busy={ocupado}>
        <div className="field">
          <span className="field__label">Clase y sesión</span>
          <p className="field__input">
            {nombreClase} ·{" "}
            {sesionAbierta ? "Sesión en curso" : "Sin sesión abierta"}
          </p>
        </div>

        <div className="toma-asistencia__columnas">
          <Card className="toma-asistencia__panel">
            <div className="toma-asistencia__preview">
              <video
                ref={videoRef}
                muted
                playsInline
                hidden={!camaraActiva}
                aria-label="Vista previa de la cámara"
              />

              {!camaraActiva && (
                <div>
                  <ScanFace size={56} strokeWidth={1.5} aria-hidden="true" />
                  <p>
                    {operacion === "camara"
                      ? "Abriendo cámara…"
                      : "Coloca un rostro dentro del recuadro."}
                  </p>
                </div>
              )}
            </div>

            <div className="toma-asistencia__controles">
              {!sesion && (
                <Button type="button" disabled={ocupado} onClick={abrir}>
                  {operacion === "abriendo"
                    ? "Abriendo…"
                    : "Abrir o continuar sesión"}
                </Button>
              )}

              {sesionAbierta && !camaraActiva && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={ocupado}
                  onClick={activarCamara}
                >
                  Activar cámara
                </Button>
              )}

              {sesionAbierta && (
                <Button
                  type="button"
                  disabled={!camaraActiva || ocupado}
                  onClick={registrar}
                >
                  {operacion === "reconociendo" ? "Reconociendo…" : "Capturar"}
                </Button>
              )}
            </div>
          </Card>

          <Card className="toma-asistencia__panel">
            <h2>Asistencias registradas</h2>

            {errorResumen && (
              <>
                <p className="message message--error" role="alert">
                  {errorResumen}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setErrorResumen("");
                    setRevisionResumen((actual) => actual + 1);
                  }}
                >
                  Reintentar
                </Button>
              </>
            )}

            {!resumen && !errorResumen && (
              <p role="status">
                {sesionAbierta
                  ? "Cargando registros…"
                  : "Abre una sesión para empezar."}
              </p>
            )}

            {resumen && (
              <>
                <p>
                  {presentes.length} presentes · {resumen.alumnos.length}{" "}
                  inscritos
                </p>

                {presentes.length === 0 && (
                  <p>Aún no hay asistencias registradas.</p>
                )}

                {presentes.map((alumno) => (
                  <div key={alumno.id}>
                    <strong>{alumno.nombre}</strong>
                    <p>
                      Matrícula {alumno.matricula} ·{" "}
                      {mostrarHoraLocal(alumno.fecha_registro)}
                    </p>
                  </div>
                ))}
              </>
            )}
          </Card>
        </div>

        {error && (
          <p className="message message--error" role="alert">
            {error}
          </p>
        )}

        {resultado && (
          <div
            className={`toma-asistencia__resultado toma-asistencia__resultado--${resultado.estado}`}
            role="status"
          >
            <strong>{resultado.mensaje}</strong>
            {resultado.nombre && (
              <p>
                {resultado.nombre} · Matrícula {resultado.matricula}
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="page__actions toma-asistencia__pie">
        <Button
          type="button"
          variant="secondary"
          aria-label="Volver a asistencias"
          disabled={ocupado}
          onClick={() => navigate("/profesor/asistencias")}
        >
          <ArrowLeft size={24} strokeWidth={2.5} aria-hidden="true" />
        </Button>

        {sesionAbierta && (
          <Button type="button" disabled={ocupado} onClick={cerrar}>
            {operacion === "cerrando" ? "Finalizando…" : "Finalizar asistencia"}
          </Button>
        )}
      </footer>
    </section>
  );
}
