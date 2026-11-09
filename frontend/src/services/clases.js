import { apiRequest } from "./api";

const TAMANO_PAGINA = 5;

export async function listarClases({ token, pagina = 0, signal }) {
  const parametros = new URLSearchParams({
    limite: String(TAMANO_PAGINA + 1),
    desplazamiento: String(pagina * TAMANO_PAGINA),
  });

  const clases = await apiRequest(`/clases?${parametros}`, {
    token,
    signal,
  });

  return {
    clases: clases.slice(0, TAMANO_PAGINA),
    haySiguiente: clases.length > TAMANO_PAGINA,
  };
}

export function obtenerClase({ claseId, token, signal }) {
  return apiRequest(`/clases/${claseId}`, { token, signal });
}

export function crearClase({ datos, token }) {
  return apiRequest("/clases", {
    method: "POST",
    body: datos,
    token,
  });
}

export function editarClase({ claseId, datos, token }) {
  return apiRequest(`/clases/${claseId}`, {
    method: "PATCH",
    body: datos,
    token,
  });
}
