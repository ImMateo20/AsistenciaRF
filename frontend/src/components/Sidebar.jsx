import { NavLink } from "react-router";

const opcionesAdministrador = [
  { label: "Profesores", to: "/admin/profesores" },
  { label: "Alumnos" },
  { label: "Asignaturas" },
  { label: "Grupos" },
  { label: "Clases" },
  { label: "Asistencias" },
];

const opcionesProfesor = [{ label: "Clases" }, { label: "Asistencias" }];

export default function Sidebar({ rol }) {
  const esAdministrador = rol === "administrador";

  const opciones = esAdministrador ? opcionesAdministrador : opcionesProfesor;

  return (
    <aside className="sidebar">
      <header className="sidebar__identity">
        <p className="sidebar__title">
          {esAdministrador ? "Administrador" : "Profesor"}
        </p>

        <p className="sidebar__description">Control de asistencia</p>
      </header>

      <nav className="sidebar__nav" aria-label="Menú principal">
        {opciones.map((opcion) =>
          opcion.to ? (
            <NavLink
              key={opcion.label}
              to={opcion.to}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? "sidebar__item--active" : ""}`
              }
            >
              {opcion.label}
            </NavLink>
          ) : (
            <button
              key={opcion.label}
              type="button"
              className="sidebar__item"
              disabled
            >
              {opcion.label}
            </button>
          )
        )}
      </nav>
    </aside>
  );
}
