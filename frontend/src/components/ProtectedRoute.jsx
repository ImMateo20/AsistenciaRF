import { Navigate, Outlet, useLocation } from "react-router";

import useAuth from "../context/useAuth";

export default function ProtectedRoute({ allowedRoles }) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return (
      <section className="page">
        <h1 className="page__title">Acceso restringido</h1>

        <p className="page__description">
          Tu cuenta no tiene permiso para abrir esta sección.
        </p>
      </section>
    );
  }

  return <Outlet />;
}
