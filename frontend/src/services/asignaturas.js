import { apiRequest } from "./api";

const TAMANO_PAGINA = 5;

export async function listarAsignaturas({ token, pagina = 0, signal }) {
  const parametros = new URLSearchParams({
    limite: String(TAMANO_PAGINA + 1),
    desplazamiento: String(pagina * TAMANO_PAGINA),
  });

  const asignaturas = await apiRequest(`/asignaturas?${parametros}`, {
    token,
    signal,
  });

  return {
    asignaturas: asignaturas.slice(0, TAMANO_PAGINA),
    haySiguiente: asignaturas.length > TAMANO_PAGINA,
  };
}

export function obtenerAsignatura({ asignaturaId, token, signal }) {
  return apiRequest(`/asignaturas/${asignaturaId}`, { token, signal });
}

export function crearAsignatura({ clave, nombre, token }) {
  return apiRequest("/asignaturas", {
    method: "POST",
    body: {
      clave: clave.trim(),
      nombre: nombre.trim(),
    },
    token,
  });
}

export function editarAsignatura({ asignaturaId, datos, token }) {
  return apiRequest(`/asignaturas/${asignaturaId}`, {
    method: "PATCH",
    body: datos,
    token,
  });
}
