import { apiRequest } from "./api";

const TAMANO_PAGINA = 5;

export async function listarAlumnos({ token, pagina = 0, signal }) {
  const parametros = new URLSearchParams({
    limite: String(TAMANO_PAGINA + 1),
    desplazamiento: String(pagina * TAMANO_PAGINA),
  });

  const alumnos = await apiRequest(`/alumnos?${parametros}`, { token, signal });

  return {
    alumnos: alumnos.slice(0, TAMANO_PAGINA),
    haySiguiente: alumnos.length > TAMANO_PAGINA,
  };
}

export function obtenerAlumno({ alumnoId, token, signal }) {
  return apiRequest(`/alumnos/${alumnoId}`, {
    token,
    signal,
  });
}

export function registrarAlumno({ nombre, matricula, capturas, token }) {
  if (!Array.isArray(capturas) || capturas.length !== 3) {
    throw new Error("Debes tomar tres capturas del rostro.");
  }

  const formulario = new FormData();

  formulario.append("nombre", nombre.trim());
  formulario.append("matricula", matricula.trim());

  capturas.forEach((captura, indice) => {
    formulario.append("imagenes", captura, `captura-${indice + 1}.jpg`);
  });

  return apiRequest("/alumnos", {
    method: "POST",
    body: formulario,
    token,
  });
}

export function editarAlumno({ alumnoId, datos, token }) {
  return apiRequest(`/alumnos/${alumnoId}`, {
    method: "PATCH",
    body: datos,
    token,
  });
}

export function editarAlumnoConRostro({
  alumnoId,
  nombre,
  matricula,
  activo,
  capturas,
  token,
}) {
  if (!Array.isArray(capturas) || capturas.length !== 3) {
    throw new Error("Debes tomar tres capturas del rostro.");
  }

  const formulario = new FormData();

  formulario.append("nombre", nombre.trim());
  formulario.append("matricula", matricula.trim());
  formulario.append("activo", String(activo));

  capturas.forEach((captura, indice) => {
    formulario.append("imagenes", captura, `captura-${indice + 1}.jpg`);
  });

  return apiRequest(`/alumnos/${alumnoId}/con-rostro`, {
    method: "PATCH",
    body: formulario,
    token,
  });
}

export async function listarAlumnosDisponibles({ token, signal, grupoId }) {
  const disponibles = [];
  let pagina = 0;

  while (true) {
    const { alumnos, haySiguiente } = await listarAlumnos({
      token,
      pagina,
      signal,
    });

    disponibles.push(
      ...alumnos.filter(
        (alumno) =>
          alumno.grupo_id === grupoId ||
          (alumno.activo && alumno.grupo_id === null)
      )
    );
    if (!haySiguiente) return disponibles;

    pagina += 1;
  }
}
