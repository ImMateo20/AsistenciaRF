import { apiRequest } from "./api";

const TAMANO_BLOQUE = 20;

async function consultarCatalogo(ruta, token, signal) {
  const registros = [];
  let desplazamiento = 0;

  while (true) {
    const parametros = new URLSearchParams({
      limite: String(TAMANO_BLOQUE),
      desplazamiento: String(desplazamiento),
    });

    const bloque = await apiRequest(`${ruta}?${parametros}`, { token, signal });

    if (!Array.isArray(bloque)) {
      throw new Error(`No se pudo cargar el catálogo de ${ruta.slice(1)}.`);
    }

    registros.push(...bloque);

    if (bloque.length < TAMANO_BLOQUE) {
      return registros;
    }

    desplazamiento += bloque.length;
  }
}

export async function consultarCatalogosClases({ token, signal }) {
  const [asignaturas, grupos, profesores] = await Promise.all([
    consultarCatalogo("/asignaturas", token, signal),
    consultarCatalogo("/grupos", token, signal),
    consultarCatalogo("/profesores", token, signal),
  ]);

  return { asignaturas, grupos, profesores };
}
