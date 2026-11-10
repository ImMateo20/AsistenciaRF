import { apiRequest } from "./api";

function rutaSesiones(claseId) {
  return `/profesor/clases/${claseId}/sesiones`;
}

export function abrirSesionAsistencia({ claseId, token }) {
  return apiRequest(rutaSesiones(claseId), { method: "POST", token });
}

export function reconocerAlumno({ claseId, sesionId, imagen, token }) {
  const formulario = new FormData();
  formulario.append("imagen", imagen, "captura.jpg");

  return apiRequest(`${rutaSesiones(claseId)}/${sesionId}/reconocer`, {
    method: "POST",
    body: formulario,
    token,
  });
}

export function cerrarSesionAsistencia({ claseId, sesionId, token }) {
  return apiRequest(`${rutaSesiones(claseId)}/${sesionId}/cerrar`, {
    method: "PATCH",
    token,
  });
}

export function listarAsistenciasProfesor({ token, signal }) {
  return apiRequest("/profesor/asistencias", { token, signal });
}

export function obtenerDetalleAsistencia({ sesionId, token, signal }) {
  return apiRequest(`/profesor/asistencias/sesiones/${sesionId}`, {
    token,
    signal,
  });
}
