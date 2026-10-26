import { Navigate, Route, Routes } from "react-router";

import Button from "./components/Button";
import AppLayout from "./layouts/AppLayout";

function ProfesoresBase() {
  return (
    <section className="page">
      <header>
        <h1 className="page__title">Profesores</h1>

        <p className="page__description">
          Gestiona la información de tu institución.
        </p>
      </header>

      <div className="page__body" />

      <footer className="page__actions">
        <Button disabled>+ Registrar profesor</Button>
      </footer>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/profesores" replace />} />

      <Route path="/admin" element={<AppLayout rol="administrador" />}>
        <Route path="profesores" element={<ProfesoresBase />} />
      </Route>

      <Route path="*" element={<p>Página no encontrada</p>} />
    </Routes>
  );
}
