import Button from "./Button";
import "./HorariosClaseFields.css";

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function HorariosClaseFields({
  bloques,
  onAgregar,
  onCambiar,
  onQuitar,
  disabled = false,
}) {
  return (
    <fieldset className="clase-horarios" disabled={disabled}>
      <legend className="clase-horarios__solo-lector">
        Horarios semanales
      </legend>

      <div className="clase-horarios__encabezado">
        <h2>Horarios semanales</h2>

        <Button type="button" variant="secondary" onClick={onAgregar}>
          + Agregar horario
        </Button>
      </div>

      <div className="clase-horarios__columnas" aria-hidden="true">
        <span className="field__label clase-horarios__etiqueta">Día</span>
        <span className="field__label clase-horarios__etiqueta">Inicio</span>
        <span className="field__label clase-horarios__etiqueta">Fin</span>
      </div>

      {bloques.map((bloque, indice) => (
        <div className="clase-horarios__fila" key={bloque.clave}>
          <label className="field">
            <span className="field__label">Día</span>
            <select
              className="field__input"
              value={bloque.dia_semana}
              onChange={(evento) =>
                onCambiar(
                  bloque.clave,
                  "dia_semana",
                  Number(evento.target.value)
                )
              }
            >
              {dias.map((dia, posicion) => (
                <option key={dia} value={posicion + 1}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Inicio</span>
            <input
              className="field__input"
              type="time"
              value={bloque.hora_inicio}
              onChange={(evento) =>
                onCambiar(bloque.clave, "hora_inicio", evento.target.value)
              }
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Fin</span>
            <input
              className="field__input"
              type="time"
              value={bloque.hora_fin}
              onChange={(evento) =>
                onCambiar(bloque.clave, "hora_fin", evento.target.value)
              }
              required
            />
          </label>

          {bloques.length > 1 && (
            <Button
              type="button"
              variant="secondary"
              aria-label={`Quitar horario ${indice + 1}`}
              onClick={() => onQuitar(bloque.clave)}
            >
              Quitar
            </Button>
          )}
        </div>
      ))}
    </fieldset>
  );
}
