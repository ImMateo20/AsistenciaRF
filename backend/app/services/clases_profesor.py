from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asignatura import Asignatura
from app.models.clase import Clase
from app.models.grupo import Grupo
from app.models.horario_clase import HorarioClase
from app.models.profesor import Profesor
from app.schemas.clase_profesor import ClaseProfesorSalida
from app.schemas.horario_clase import HorarioBloqueSalida


def listar_clases_del_profesor(
    db: Session, usuario_id: int
) -> list[ClaseProfesorSalida]:
    consulta = (
        select(Clase.id, Asignatura.nombre, Grupo.nombre, Clase.activo, HorarioClase)
        .select_from(Clase)
        .join(Profesor, Profesor.id == Clase.profesor_id)
        .join(Asignatura, Asignatura.id == Clase.asignatura_id)
        .join(Grupo, Grupo.id == Clase.grupo_id)
        .outerjoin(HorarioClase, HorarioClase.clase_id == Clase.id)
        .where(Profesor.usuario_id == usuario_id)
        .order_by(Clase.id, HorarioClase.dia_semana, HorarioClase.hora_inicio)
    )

    clases: dict[int, ClaseProfesorSalida] = {}

    for clase_id, asignatura, grupo, activo, horario in db.execute(consulta):
        if clase_id not in clases:
            clases[clase_id] = ClaseProfesorSalida(
                id=clase_id,
                asignatura=asignatura,
                grupo=grupo,
                activo=activo,
            )

        if horario is not None:
            clases[clase_id].horarios.append(
                HorarioBloqueSalida.model_validate(horario)
            )

    return list(clases.values())
    