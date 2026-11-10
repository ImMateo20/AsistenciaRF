import { Navigate, Route, Routes } from "react-router";

import ProtectedRoute from "./components/ProtectedRoute";
import useAuth from "./context/useAuth";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import ProfesoresPage from "./pages/ProfesoresPage";
import ProfesorCrearPage from "./pages/ProfesorCrearPage";
import ProfesorEditarPage from "./pages/ProfesorEditarPage";
import AlumnosPage from "./pages/AlumnosPage";
import AlumnoCrearPage from "./pages/AlumnoCrearPage";
import AlumnoEditarPage from "./pages/AlumnoEditarPage";
import AsignaturasPage from "./pages/AsignaturasPage";
import AsignaturaFormularioPage from "./pages/AsignaturaFormularioPage";
import GruposPage from "./pages/GruposPage";
import GrupoCrearPage from "./pages/GrupoCrearPage";
import GrupoEditarPage from "./pages/GrupoEditarPage";
import ClasesPage from "./pages/ClasesPage";
import ClaseCrearPage from "./pages/ClaseCrearPage";
import ClaseEditarPage from "./pages/ClaseEditarPage";
import MisClasesPage from "./pages/MisClasesPage";
import TomarAsistenciaPage from "./pages/TomarAsistenciaPage";
import AsistenciasProfesorPage from "./pages/AsistenciasProfesorPage";

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
          <Route path="alumnos" element={<AlumnosPage />} />
          <Route path="alumnos/registrar" element={<AlumnoCrearPage />} />
          <Route
            path="alumnos/:alumnoId/editar"
            element={<AlumnoEditarPage />}
          />
          <Route path="asignaturas" element={<AsignaturasPage />} />
          <Route
            path="asignaturas/crear"
            element={<AsignaturaFormularioPage />}
          />
          <Route
            path="asignaturas/:asignaturaId/editar"
            element={<AsignaturaFormularioPage />}
          />
          <Route path="grupos" element={<GruposPage />} />
          <Route path="grupos/crear" element={<GrupoCrearPage />} />
          <Route path="grupos/:grupoId/editar" element={<GrupoEditarPage />} />
          <Route path="clases" element={<ClasesPage />} />
          <Route path="clases/crear" element={<ClaseCrearPage />} />
          <Route path="clases/:claseId/editar" element={<ClaseEditarPage />} />
          <Route
            path="asistencias"
            element={<AsistenciasProfesorPage administrador />}
          />

          <Route
            path="asistencias/sesiones/:sesionId"
            element={<AsistenciasProfesorPage administrador />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["profesor"]} />}>
        <Route path="/profesor" element={<AppLayout />}>
          <Route index element={<Navigate to="clases" replace />} />

          <Route path="clases" element={<MisClasesPage />} />

          <Route path="clases/:claseId" element={<MisClasesPage />} />

          <Route
            path="clases/:claseId/asistencia"
            element={<TomarAsistenciaPage />}
          />

          <Route path="asistencias" element={<AsistenciasProfesorPage />} />

          <Route
            path="asistencias/tomar"
            element={<MisClasesPage modoAsistencia />}
          />

          <Route
            path="asistencias/:claseId"
            element={<TomarAsistenciaPage />}
          />

          <Route
            path="asistencias/sesiones/:sesionId"
            element={<AsistenciasProfesorPage />}
          />
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
