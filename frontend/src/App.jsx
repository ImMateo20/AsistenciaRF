import { Navigate, Route, Routes } from "react-router";

import ProtectedRoute from "./components/ProtectedRoute";
import useAuth from "./context/useAuth";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import ProfesoresPage from "./pages/ProfesoresPage";
import ProfesorCrearPage from "./pages/ProfesorCrearPage";
import ProfesorEditarPage from "./pages/ProfesorEditarPage";

function Inicio() {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={
        usuario.rol === "administrador"
          ? "/admin/profesores"
          : "/profesor/clases"
      }
      replace
    />
  );
}

function ClasesBase() {
  return (
    <section className="page">
      <header>
        <h1 className="page__title">Clases</h1>

        <p className="page__description">
          Consulta tus clases y sus alumnos inscritos.
        </p>
      </header>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={["administrador"]} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<Navigate to="profesores" replace />} />

          <Route path="profesores" element={<ProfesoresPage />} />
          <Route path="profesores/registrar" element={<ProfesorCrearPage />} />
          <Route
            path="profesores/:profesorId/editar"
            element={<ProfesorEditarPage />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["profesor"]} />}>
        <Route path="/profesor" element={<AppLayout />}>
          <Route index element={<Navigate to="clases" replace />} />

          <Route path="clases" element={<ClasesBase />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <main className="main-content">
            <h1>Página no encontrada</h1>
          </main>
        }
      />
    </Routes>
  );
}
