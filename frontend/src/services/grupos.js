import { apiRequest } from "./api";

const TAMANO_PAGINA = 5;

export async function listarGrupos({ token, pagina = 0, signal }) {
  const parametros = new URLSearchParams({
    limite: String(TAMANO_PAGINA + 1),
    desplazamiento: String(pagina * TAMANO_PAGINA),
  });

  const grupos = await apiRequest(`/grupos?${parametros}`, {
    token,
    signal,
  });

  return {
    grupos: grupos.slice(0, TAMANO_PAGINA),
    haySiguiente: grupos.length > TAMANO_PAGINA,
  };
}

export function obtenerGrupo({ grupoId, token, signal }) {
  return apiRequest(`/grupos/${grupoId}`, { token, signal });
}

export function crearGrupo({ nombre, alumnoIds = [], token }) {
  return apiRequest("/grupos", {
    method: "POST",
    body: {
      nombre: nombre.trim(),
      alumno_ids: alumnoIds,
    },
    token,
  });
}

export function editarGrupo({ grupoId, datos, token }) {
  return apiRequest(`/grupos/${grupoId}`, {
    method: "PATCH",
    body: datos,
    token,
  });
}
