import { useEffect, useRef, useState } from "react";

function detenerFlujo(flujo) {
  flujo?.getTracks().forEach((pista) => pista.stop());
}

export default function useCamara() {
  const videoRef = useRef(null);
  const flujoRef = useRef(null);
  const solicitudRef = useRef(0);

  const [camaras, setCamaras] = useState([]);
  const [camaraId, setCamaraId] = useState("");
  const [activa, setActiva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      solicitudRef.current += 1;
      detenerFlujo(flujoRef.current);
      flujoRef.current = null;
    };
  }, []);

  function desactivarCamara() {
    solicitudRef.current += 1;

    detenerFlujo(flujoRef.current);
    flujoRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setActiva(false);
    setCargando(false);
    setError("");
  }

  async function activarCamara(dispositivoId = "") {
    const solicitud = ++solicitudRef.current;

    setCargando(true);
    setError("");
    setActiva(false);

    detenerFlujo(flujoRef.current);
    flujoRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    let flujo;

    async function solicitarCamara(id = "") {
      const nuevoFlujo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(id ? { deviceId: { exact: id } } : {}),
        },
      });

      if (solicitud !== solicitudRef.current) {
        detenerFlujo(nuevoFlujo);
        throw new DOMException("Solicitud cancelada", "AbortError");
      }

      return nuevoFlujo;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "La cámara requiere un navegador compatible y acceso desde localhost o HTTPS."
        );
      }

      flujo = await solicitarCamara(dispositivoId);

      const dispositivos = await navigator.mediaDevices.enumerateDevices();

      if (solicitud !== solicitudRef.current) {
        detenerFlujo(flujo);
        return;
      }

      const disponibles = dispositivos.filter(
        (dispositivo) => dispositivo.kind === "videoinput"
      );

      // Solo intentamos identificar una externa al activar inicialmente.
      if (!dispositivoId) {
        const externa = disponibles.find(
          (dispositivo) =>
            /external|externa|usb/i.test(dispositivo.label) &&
            !/integrated|integrada|built.in/i.test(dispositivo.label)
        );

        const actualId = flujo.getVideoTracks()[0]?.getSettings().deviceId;

        if (externa && externa.deviceId !== actualId) {
          detenerFlujo(flujo);
          flujo = null;

          try {
            flujo = await solicitarCamara(externa.deviceId);
          } catch (errorExterna) {
            if (errorExterna.name === "AbortError") throw errorExterna;

            // Si la externa falla, usamos la cámara predeterminada.
            flujo = await solicitarCamara();
          }
        }
      }

      const video = videoRef.current;

      if (!video || solicitud !== solicitudRef.current) {
        detenerFlujo(flujo);
        return;
      }

      flujoRef.current = flujo;
      video.srcObject = flujo;

      await video.play();

      if (solicitud !== solicitudRef.current) {
        detenerFlujo(flujo);
        return;
      }

      setCamaras(disponibles);
      setCamaraId(flujo.getVideoTracks()[0]?.getSettings().deviceId || "");
      setActiva(true);
    } catch (errorCamara) {
      detenerFlujo(flujo);

      if (solicitud !== solicitudRef.current) return;

      flujoRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      const mensajes = {
        NotAllowedError: "Permite el acceso a la cámara desde el navegador.",
        NotFoundError: "No se encontró una cámara disponible.",
        NotReadableError:
          "No se pudo abrir la cámara. Comprueba si otra aplicación la está usando.",
        OverconstrainedError:
          "La cámara seleccionada ya no está disponible. Vuelve a activar la cámara.",
      };

      setError(
        mensajes[errorCamara.name] ||
          errorCamara.message ||
          "No se pudo activar la cámara."
      );
    } finally {
      if (solicitud === solicitudRef.current) {
        setCargando(false);
      }
    }
  }

  return {
    videoRef,
    camaras,
    camaraId,
    activa,
    cargando,
    error,
    activarCamara,
    desactivarCamara,
  };
}
