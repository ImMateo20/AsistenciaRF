import { apiRequest } from "./api";

export function listarMisClases({ token, signal }) {
  return apiRequest("/profesor/clases", { token, signal });
}

export function listarAlumnosDeMiClase({ claseId, token, signal }) {
  return apiRequest(`/profesor/clases/${claseId}/alumnos`, { token, signal });
}
