from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.clase import Clase
from app.models.profesor import Profesor
from app.models.sesion_clase import SesionClase
from app.schemas.sesion_clase import SesionClaseSalida
from app.utils.fechas import obtener_fecha_utc


def obtener_clase_propia(
    db: Session,
    *,
    clase_id: int,
    usuario_id: int,
) -> Clase:
    clase = db.scalar(
        select(Clase)
        .join(Profesor, Profesor.id == Clase.profesor_id)
        .where(Clase.id == clase_id, Profesor.usuario_id == usuario_id)
        .with_for_update()
    )

    if clase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró esta clase.",
        )

    return clase


def abrir_sesion(
    db: Session,
    *,
    clase_id: int,
    usuario_id: int,
) -> SesionClaseSalida:
    clase = obtener_clase_propia(db, clase_id=clase_id, usuario_id=usuario_id)

    if not clase.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes abrir una sesión para una clase inactiva.",
        )

    sesion = db.scalar(
        select(SesionClase)
        .where(
            SesionClase.clase_id == clase.id,
            SesionClase.estado == "abierta",
        )
        .with_for_update()
    )

    if sesion is None:
        sesion = SesionClase(clase_id=clase.id, estado="abierta")
        db.add(sesion)
        db.flush()

    resultado = SesionClaseSalida.model_validate(sesion)
    db.commit()
    return resultado


def cerrar_sesion(
    db: Session,
    *,
    clase_id: int,
    sesion_id: int,
    usuario_id: int,
) -> SesionClaseSalida:
    obtener_clase_propia(db, clase_id=clase_id, usuario_id=usuario_id)

    sesion = db.scalar(
        select(SesionClase)
        .where(SesionClase.id == sesion_id, SesionClase.clase_id == clase_id)
        .with_for_update()
    )

    if sesion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró esta sesión.",
        )

    if sesion.estado == "abierta":
        sesion.estado = "cerrada"
        sesion.fecha_cierre = obtener_fecha_utc()

    resultado = SesionClaseSalida.model_validate(sesion)
    db.commit()
    return resultado
