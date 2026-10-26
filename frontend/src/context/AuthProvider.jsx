import { useCallback, useState } from "react";

import { AuthContext } from "./AuthContext";
import {
  iniciarSesion,
  consultarMiCuenta,
  cerrarSesion,
} from "../services/auth";
import { ApiError } from "../services/api";

export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);

  async function login(correo, password) {
    const respuesta = await iniciarSesion(correo, password);

    if (!respuesta?.access_token) {
      throw new Error("El servidor no devolvió un token de acceso.");
    }

    const usuario = await consultarMiCuenta(respuesta.access_token);

    if (
      !usuario?.activo ||
      !["administrador", "profesor"].includes(usuario.rol)
    ) {
      throw new Error("La cuenta no tiene un acceso válido.");
    }

    setSesion({
      token: respuesta.access_token,
      usuario,
    });

    return usuario;
  }

  async function logout() {
    if (!sesion) {
      return;
    }

    try {
      await cerrarSesion(sesion.token);
    } catch (error) {
      // Si el token ya no es válido, también salimos localmente.
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }

    setSesion(null);
  }

  const limpiarSesion = useCallback(() => {
    setSesion(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario: sesion?.usuario ?? null,
        token: sesion?.token ?? null,
        login,
        logout,
        limpiarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
