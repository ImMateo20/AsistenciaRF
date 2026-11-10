import { apiRequest } from "./api";

export function listarAsistenciasAdmin({ token, signal }) {
  return apiRequest("/admin/asistencias", {
    token,
    signal,
  });
}

export function obtenerDetalleAsistenciaAdmin({ sesionId, token, signal }) {
  return apiRequest(`/admin/asistencias/sesiones/${sesionId}`, {
    token,
    signal,
  });
}
