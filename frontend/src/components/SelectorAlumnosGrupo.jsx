export default function SelectorAlumnosGrupo({
  alumnos,
  alumnoIds,
  onChange,
  disabled = false,
}) {
  return (
    <fieldset className="grupo-alumnos" disabled={disabled}>
      <legend className="field__label">Alumnos del grupo</legend>

      <p className="grupo-alumnos__total" role="status">
        {alumnoIds.length}{" "}
        {alumnoIds.length === 1 ? "seleccionado" : "seleccionados"}
      </p>

      {alumnos.length === 0 ? (
        <p>No hay alumnos disponibles.</p>
      ) : (
        <div className="grupo-alumnos__lista">
          {alumnos.map((alumno) => (
            <label className="grupo-alumnos__opcion" key={alumno.id}>
              <input
                type="checkbox"
                checked={alumnoIds.includes(alumno.id)}
                onChange={(evento) =>
                  onChange(alumno.id, evento.target.checked)
                }
              />
              <span>
                <strong>{alumno.nombre}</strong>
                <small>{alumno.matricula}</small>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
