import { apiRequest } from "./api";

export const TAMANO_PAGINA = 20;

export async function consultarProfesores(token, pagina, signal) {
  const parametros = new URLSearchParams({
    limite: String(TAMANO_PAGINA + 1),
    desplazamiento: String(pagina * TAMANO_PAGINA),
  });

  const datos = await apiRequest(`/profesores?${parametros}`, {
    token,
    signal,
  });

  if (!Array.isArray(datos)) {
    throw new Error("El servidor devolvió un listado inválido.");
  }

  return {
    profesores: datos.slice(0, TAMANO_PAGINA),
    haySiguiente: datos.length > TAMANO_PAGINA,
  };
}

export function registrarProfesor(token, datos) {
  return apiRequest("/profesores", {
    method: "POST",
    token,
    body: datos,
  });
}

export function consultarProfesor(token, profesorId, signal) {
  return apiRequest(`/profesores/${profesorId}`, {
    token,
    signal,
  });
}

export function editarProfesor(token, profesorId, cambios) {
  return apiRequest(`/profesores/${profesorId}`, {
    method: "PATCH",
    token,
    body: cambios,
  });
}
