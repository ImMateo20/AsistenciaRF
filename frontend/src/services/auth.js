import { apiRequest } from "./api";

export function iniciarSesion(correo, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { correo, password },
  });
}

export function consultarMiCuenta(token) {
  return apiRequest("/auth/me", { token });
}

export function cerrarSesion(token) {
  return apiRequest("/auth/logout", {
    method: "POST",
    token,
  });
}
