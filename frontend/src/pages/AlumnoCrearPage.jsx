import { useState } from "react";
import { useNavigate } from "react-router";

import useAuth from "../context/useAuth";
import { ApiError } from "../services/api";
import { registrarAlumno } from "../services/alumnos";

import iconoCamara from "../assets/camara-registro.svg";
import Button from "../components/Button";
import Card from "../components/Card";
import InputField from "../components/InputField";
import useCamara from "../hooks/useCamara";

const INDICACIONES = [
  "Primera captura: mira de frente.",
  "Segunda captura: gira ligeramente hacia un lado.",
  "Tercera captura: gira ligeramente hacia el otro lado.",
];

export default function AlumnoCrearPage() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [matricula, setMatricula] = useState("");
  const [capturas, setCapturas] = useState([]);
  const [capturando, setCapturando] = useState(false);
  const [errorCaptura, setErrorCaptura] = useState("");

  const { token, limpiarSesion } = useAuth();

  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState("");

  const {
    videoRef,
    camaras,
    camaraId,
    activa,
    cargando: cargandoCamara,
    error: errorCamara,
    activarCamara,
  } = useCamara();

  function cancelar() {
    if (guardando) return;
    const hayCambios =
      nombre.trim() !== "" || matricula.trim() !== "" || capturas.length > 0;

    if (
      hayCambios &&
      !window.confirm("¿Quieres salir sin guardar los datos del alumno?")
    ) {
      return;
    }

    navigate("/admin/alumnos");
  }

  async function capturarRostro() {
    if (guardando || capturando || capturas.length >= 3) return;
    const video = videoRef.current;

    if (
      !activa ||
      cargandoCamara ||
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setErrorCaptura("Espera a que la cámara muestre la imagen.");
      return;
    }

    setCapturando(true);
    setErrorCaptura("");

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
      setErrorCaptura(error.message || "No se pudo tomar la captura.");
    } finally {
      setCapturando(false);
    }
  }

  function repetirCapturas() {
    setCapturas([]);
    setErrorCaptura("");
  }

  async function guardarAlumno(evento) {
    evento.preventDefault();

    if (guardando || capturando || cargandoCamara) return;

    setErrorRegistro("");

    if (!nombre.trim() || !matricula.trim()) {
      setErrorRegistro("Completa el nombre y la matrícula.");
      return;
    }

    if (capturas.length !== 3) {
      setErrorRegistro("Toma las tres capturas antes de guardar.");
      return;
    }

    setGuardando(true);

    try {
      await registrarAlumno({
        nombre,
        matricula,
        capturas,
        token,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        limpiarSesion();
        return;
      }

      setErrorRegistro(error.message || "No se pudo registrar al alumno.");
      return;
    } finally {
      setGuardando(false);
    }

    navigate("/admin/alumnos", {
      replace: true,
      state: {
        mensaje: "Alumno registrado correctamente.",
      },
    });
  }

  return (
    <section className="page">
      <header>
        <h1 className="page__title">Registrar alumno</h1>

        <p className="page__description">
          Datos y rostro del alumno en un mismo registro.
        </p>
      </header>

      <form
        className="alumno-form"
        onSubmit={guardarAlumno}
        aria-busy={guardando}
      >
        <div className="page__body alumno-form__body">
          <div className="alumno-form__columns">
            <Card className="alumno-form__panel alumno-form__datos">
              <h2 className="alumno-form__subtitle">Datos del alumno</h2>

              <InputField
                label="Nombre completo"
                name="nombre"
                placeholder="Escribe el nombre"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                maxLength={150}
                autoComplete="off"
                required
                disabled={guardando}
              />

              <InputField
                label="Matrícula"
                name="matricula"
                placeholder="Ej. 2270700"
                value={matricula}
                onChange={(evento) => setMatricula(evento.target.value)}
                maxLength={20}
                autoComplete="off"
                required
                disabled={guardando}
              />

              <p className="alumno-form__ayuda">
                Las clases se asignan desde la sección Clases. Un alumno puede
                cursar materias en distintos grupos.
              </p>
            </Card>

            <Card className="alumno-form__panel alumno-form__facial">
              <div className="alumno-form__facial-header">
                <h2 className="alumno-form__subtitle">Registro facial</h2>

                {camaras.length > 1 && (
                  <select
                    className="alumno-form__camera-select"
                    aria-label="Seleccionar cámara"
                    title="Seleccionar cámara"
                    value={camaraId}
                    disabled={cargandoCamara || capturando || guardando}
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
                  hidden={!activa}
                  aria-label="Vista en vivo de la cámara"
                />

                {!activa && (
                  <>
                    <img src={iconoCamara} alt="" width={64} height={64} />

                    <p>
                      {cargandoCamara
                        ? "Abriendo cámara…"
                        : "Coloca el rostro al centro"}
                    </p>
                  </>
                )}
              </div>

              <p className="alumno-form__ayuda">
                Buena iluminación y rostro descubierto.
              </p>

              <p className="alumno-form__indicacion" role="status">
                {capturas.length === 3
                  ? "Tres capturas listas."
                  : activa
                  ? INDICACIONES[capturas.length]
                  : "Activa la cámara para comenzar."}
              </p>

              {errorCamara && (
                <p className="message message--error" role="alert">
                  {errorCamara}
                </p>
              )}

              {errorCaptura && (
                <p className="message message--error" role="alert">
                  {errorCaptura}
                </p>
              )}

              <div className="alumno-form__camera-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={cargandoCamara || capturando || guardando}
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
                  disabled={
                    !activa ||
                    cargandoCamara ||
                    capturando ||
                    guardando ||
                    capturas.length >= 3
                  }
                  onClick={capturarRostro}
                >
                  {capturando ? "Capturando…" : "Capturar"}
                </Button>

                {capturas.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={capturando || guardando}
                    onClick={repetirCapturas}
                  >
                    Repetir capturas
                  </Button>
                )}
              </div>

              <p className="alumno-form__ayuda" role="status">
                Capturas: {capturas.length} / 3
              </p>
            </Card>
          </div>
          {errorRegistro && (
            <p className="message message--error" role="alert">
              {errorRegistro}
            </p>
          )}
        </div>

        <footer className="page__actions alumno-form__footer">
          <aside className="alumno-form__notice">
            <h2>Completa los datos y las capturas</h2>

            <p>
              Revisa que el nombre y la matrícula correspondan al rostro
              capturado.
            </p>
          </aside>

          <div className="alumno-form__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={capturando || guardando}
              onClick={cancelar}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={
                guardando ||
                capturando ||
                cargandoCamara ||
                capturas.length !== 3 ||
                !nombre.trim() ||
                !matricula.trim()
              }
            >
              {guardando ? "Guardando…" : "Guardar alumno"}
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}
