from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select, case
from sqlalchemy.orm import Session

from app.models.clase import Clase
from app.models.grupo import Grupo
from app.models.horario_clase import HorarioClase
from app.schemas.horario_clase import BloqueHorario
from app.models.profesor import Profesor

DIAS = (
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
)


def comprobar_horario_de_clase(
    db: Session,
    *,
    grupo_id: int,
    profesor_id: int,
    bloques: list[BloqueHorario],
    excluir_clase_id: int | None = None,
) -> None:
    # Bloqueamos siempre en el mismo orden antes de revisar los cruces.
    for modelo, identificador, nombre in (
        (Grupo, grupo_id, "El grupo"),
        (Profesor, profesor_id, "El profesor"),
    ):
        existe = db.scalar(
            select(modelo.id).where(modelo.id == identificador).with_for_update()
        )

        if existe is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{nombre} no existe.",
            )

    if not bloques:
        return

    cruces = [
        and_(
            HorarioClase.dia_semana == bloque.dia_semana,
            HorarioClase.hora_inicio < bloque.hora_fin,
            HorarioClase.hora_fin > bloque.hora_inicio,
        )
        for bloque in bloques
    ]

    consulta = (
        select(Clase.grupo_id, HorarioClase.dia_semana)
        .join(HorarioClase, HorarioClase.clase_id == Clase.id)
        .where(
            Clase.activo.is_(True),
            or_(Clase.grupo_id == grupo_id, Clase.profesor_id == profesor_id),
            or_(*cruces),
        )
    )

    if excluir_clase_id is not None:
        consulta = consulta.where(Clase.id != excluir_clase_id)

    conflicto = db.execute(
        consulta.order_by(
            case((Clase.grupo_id == grupo_id, 0), else_=1),
            HorarioClase.dia_semana,
            HorarioClase.hora_inicio,
        )
        .limit(1)
        .with_for_update()
    ).first()

    if conflicto is not None:
        grupo_en_conflicto, dia = conflicto
        ocupado = "El grupo" if grupo_en_conflicto == grupo_id else "El profesor"

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"{ocupado} ya tiene otra clase que se cruza "
                f"con ese horario el {DIAS[dia - 1]}."
            ),
        )
