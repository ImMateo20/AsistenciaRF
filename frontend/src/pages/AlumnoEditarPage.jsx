import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import Button from "../components/Button";
import InputField from "../components/InputField";
import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import {
  obtenerAlumno,
  editarAlumno,
  editarAlumnoConRostro,
} from "../services/alumnos";
import Card from "../components/Card";
import iconoCamara from "../assets/camara-registro.svg";
import useCamara from "../hooks/useCamara";

export default function AlumnoEditarPage() {
  const { alumnoId } = useParams();

  return <CargarAlumno key={alumnoId} alumnoId={alumnoId} />;
}

function CargarAlumno({ alumnoId }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [intento, setIntento] = useState(0);
  const [carga, setCarga] = useState({
    estado: "cargando",
    alumno: null,
    error: "",
  });

  const idValido = /^[1-9][0-9]*$/.test(alumnoId ?? "");

  useEffect(() => {
    if (!idValido) return;

    const controlador = new AbortController();

    obtenerAlumno({
      alumnoId,
      token,
      signal: controlador.signal,
    })
      .then((alumno) => {
        if (controlador.signal.aborted) return;

        setCarga({
          estado: "listo",
          alumno,
          error: "",
        });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          limpiarSesion();
          return;
        }

        setCarga({
          estado: "error",
          alumno: null,
          error: error.message || "No se pudo cargar al alumno.",
        });
      });

    return () => controlador.abort();
  }, [alumnoId, token, idValido, intento, limpiarSesion]);

  function reintentar() {
    setCarga({
      estado: "cargando",
      alumno: null,
      error: "",
    });

    setIntento((actual) => actual + 1);
  }

  if (!idValido) {
    return (
      <section className="page">
        <h1 className="page__title">Alumno no válido</h1>

        <Button variant="secondary" onClick={() => navigate("/admin/alumnos")}>
          Regresar
        </Button>
      </section>
    );
  }

  if (carga.estado === "cargando") {
    return (
      <section className="page">
        <p role="status">Cargando alumno…</p>
      </section>
    );
  }

  if (carga.estado === "error") {
    return (
      <section className="page">
        <h1 className="page__title">Editar alumno</h1>

        <div className="page__body profesores__feedback">
          <p className="message message--error" role="alert">
            {carga.error}
          </p>

          <Button variant="secondary" onClick={reintentar}>
            Reintentar
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/admin/alumnos")}
          >
            Regresar
          </Button>
        </div>
      </section>
    );
  }

  return <FormularioEditarAlumno alumno={carga.alumno} />;
}

function FormularioEditarAlumno({ alumno }) {
  const navigate = useNavigate();
  const { token, limpiarSesion } = useAuth();

  const [datos, setDatos] = useState({
    nombre: alumno.nombre,
    matricula: alumno.matricula,
    activo: alumno.activo,
  });

  const [actualizandoRostro, setActualizandoRostro] = useState(false);
  const [capturas, setCapturas] = useState([]);
  const [capturando, setCapturando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const {
    videoRef,
    camaras,
    camaraId,
    activa,
    cargando: cargandoCamara,
    error: errorCamara,
    activarCamara,
    desactivarCamara,
  } = useCamara();

  const ocupado = guardando || capturando || cargandoCamara;

  const indicaciones = [
    "Primera captura: mira de frente.",
    "Segunda captura: gira ligeramente hacia un lado.",
    "Tercera captura: gira ligeramente hacia el otro lado.",
  ];

  function actualizarCampo(evento) {
    const { name, value } = evento.target;

    setDatos((actuales) => ({
      ...actuales,
      [name]: value,
    }));
  }

  function obtenerCambios() {
    const actuales = {
      nombre: datos.nombre.trim(),
      matricula: datos.matricula.trim(),
      activo: datos.activo,
    };

    return Object.fromEntries(
      Object.entries(actuales).filter(
        ([campo, valor]) => valor !== alumno[campo]
      )
    );
  }

  function cancelar() {
    if (ocupado) return;

    const hayCambios =
      Object.keys(obtenerCambios()).length > 0 || capturas.length > 0;

    if (
      hayCambios &&
      !window.confirm("¿Descartar los cambios del formulario?")
    ) {
      return;
    }

    navigate("/admin/alumnos");
  }

  function iniciarActualizacion() {
    if (ocupado) return;

    setActualizandoRostro(true);
    setCapturas([]);
    setError("");
    activarCamara();
  }

  function repetirCapturas() {
    if (ocupado) return;

    setCapturas([]);
    setError("");
  }

  function conservarRostro() {
    if (ocupado) return;

    if (
      capturas.length > 0 &&
      !window.confirm("¿Descartar las nuevas capturas?")
    ) {
      return;
    }

    desactivarCamara();
    setActualizandoRostro(false);
    setCapturas([]);
    setError("");
  }

  async function capturarRostro() {
    if (ocupado || capturas.length >= 3) return;

    const video = videoRef.current;

    if (
      !activa ||
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError("Espera a que la cámara muestre la imagen.");
      return;
    }

    setCapturando(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      const escala = Math.min(
        1,
        1280 / Math.max(video.videoWidth, video.videoHeight)
      );

      canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
      canvas.height = Math.max(1, Math.round(video.videoHeight * escala));

      const contexto = canvas.getContext("2d");

      if (!contexto) {
        throw new Error("No se pudo preparar la captura.");
      }

      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imagen = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (archivo) => {
            if (archivo) {
              resolve(archivo);
            } else {
              reject(new Error("No se pudo generar la fotografía."));
            }
          },
          "image/jpeg",
          0.9
        );
      });

      setCapturas((actuales) =>
        actuales.length < 3 ? [...actuales, imagen] : actuales
      );
    } catch (error) {
      setError(error.message || "No se pudo tomar la captura.");
    } finally {
      setCapturando(false);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();

    if (ocupado) return;

    setError("");

    if (!datos.nombre.trim()) {
      setError("Introduce el nombre del alumno.");
      return;
    }

    if (!/^[0-9]{1,20}$/.test(datos.matricula.trim())) {
      setError("La matrícula debe contener entre 1 y 20 números.");
      return;
    }

    if (actualizandoRostro && capturas.length !== 3) {
      setError(
        "Completa las tres capturas o selecciona Conservar rostro actual."
      );
      return;
    }

    const cambios = obtenerCambios();

    if (!actualizandoRostro && Object.keys(cambios).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setGuardando(true);

    try {
      if (actualizandoRostro) {
        await editarAlumnoConRostro({
          alumnoId: alumno.id,
          nombre: datos.nombre,
          matricula: datos.matricula,
          activo: datos.activo,
          capturas,
          token,
        });
      } else {
        await editarAlumno({
          alumnoId: alumno.id,
          datos: cambios,
          token,
        });
      }

      navigate("/admin/alumnos", {
        replace: true,
        state: {
          mensaje: "Alumno actualizado correctamente.",
        },
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
    <section className="page">
      <header>
        <h1 className="page__title">Editar alumno</h1>

        <p className="page__description">
          Actualiza los datos y, si lo necesitas, las capturas del rostro.
        </p>
      </header>

      <form className="alumno-form" onSubmit={guardar} aria-busy={guardando}>
        <div className="page__body alumno-form__body">
          <div className="alumno-form__columns">
            <Card className="alumno-form__panel alumno-form__datos">
              <h2 className="alumno-form__subtitle">Datos del alumno</h2>

              <InputField
                label="Nombre completo"
                name="nombre"
                value={datos.nombre}
                onChange={actualizarCampo}
                maxLength={150}
                required
                disabled={guardando}
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
                disabled={guardando}
              />

              <div className="field">
                <label className="field__label" htmlFor="estado-alumno">
                  Estado
                </label>

                <select
                  id="estado-alumno"
                  className="field__input"
                  value={datos.activo ? "activo" : "inactivo"}
                  onChange={(evento) =>
                    setDatos((actuales) => ({
                      ...actuales,
                      activo: evento.target.value === "activo",
                    }))
                  }
                  disabled={guardando}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <p className="alumno-form__ayuda">
                Las clases se asignan desde la sección Clases. Un alumno puede
                cursar materias en distintos grupos.
              </p>
            </Card>

            <Card className="alumno-form__panel alumno-form__facial">
              <div className="alumno-form__facial-header">
                <h2 className="alumno-form__subtitle">Registro facial</h2>

                {actualizandoRostro && camaras.length > 1 && (
                  <select
                    className="alumno-form__camera-select"
                    aria-label="Seleccionar cámara"
                    title="Seleccionar cámara"
                    value={camaraId}
                    disabled={ocupado}
                    onChange={(evento) => activarCamara(evento.target.value)}
                  >
                    {camaras.map((camara, indice) => (
                      <option key={camara.deviceId} value={camara.deviceId}>
                        {camara.label || `Cámara ${indice + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="alumno-form__preview">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  hidden={!activa || !actualizandoRostro}
                  aria-label="Vista en vivo de la cámara"
                />

                {(!activa || !actualizandoRostro) && (
                  <>
                    <img src={iconoCamara} alt="" width={64} height={64} />

                    <p>
                      {!actualizandoRostro
                        ? "Conserva el rostro actual o toma nuevas capturas"
                        : cargandoCamara
                        ? "Abriendo cámara…"
                        : "Coloca el rostro al centro"}
                    </p>
                  </>
                )}
              </div>

              <p className="alumno-form__indicacion" role="status">
                {!actualizandoRostro
                  ? "No es necesario repetir las capturas para editar los datos."
                  : capturas.length === 3
                  ? "Tres capturas listas para guardar."
                  : activa
                  ? indicaciones[capturas.length]
                  : "Activa la cámara para comenzar."}
              </p>

              {actualizandoRostro && errorCamara && (
                <p className="message message--error" role="alert">
                  {errorCamara}
                </p>
              )}

              <div className="alumno-form__camera-actions">
                {!actualizandoRostro ? (
                  <Button
                    type="button"
                    disabled={ocupado}
                    onClick={iniciarActualizacion}
                  >
                    Actualizar capturas
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={ocupado}
                      onClick={() => activarCamara()}
                    >
                      {cargandoCamara
                        ? "Activando…"
                        : activa
                        ? "Reiniciar cámara"
                        : "Activar cámara"}
                    </Button>

                    <Button
                      type="button"
                      disabled={ocupado || !activa || capturas.length >= 3}
                      onClick={capturarRostro}
                    >
                      {capturando ? "Capturando…" : "Capturar"}
                    </Button>

                    {capturas.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={ocupado}
                        onClick={repetirCapturas}
                      >
                        Repetir
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={ocupado}
                      onClick={conservarRostro}
                    >
                      Conservar rostro actual
                    </Button>
                  </>
                )}
              </div>

              {actualizandoRostro && (
                <p className="alumno-form__ayuda" role="status">
                  Capturas nuevas: {capturas.length} / 3
                </p>
              )}
            </Card>
          </div>

          {error && (
            <p className="message message--error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="page__actions alumno-form__footer">
          <aside className="alumno-form__notice">
            <h2>
              {actualizandoRostro
                ? capturas.length === 3
                  ? "Capturas completas"
                  : "Completa las nuevas capturas"
                : "Revisa los datos del alumno"}
            </h2>

            <p>
              {actualizandoRostro
                ? "Los datos y las nuevas capturas se guardarán al pulsar Guardar cambios."
                : "El rostro actual se conservará al guardar los cambios."}
            </p>
          </aside>

          <div className="alumno-form__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={ocupado}
              onClick={cancelar}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={
                ocupado || (actualizandoRostro && capturas.length !== 3)
              }
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}
