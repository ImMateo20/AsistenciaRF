from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.asignatura import Asignatura
from app.schemas.asignatura import (
    AsignaturaCrear,
    AsignaturaEditar,
    AsignaturaSalida,
)


def listar_asignaturas(
    db: Session,
    limite: int,
    desplazamiento: int,
) -> list[AsignaturaSalida]:
    consulta = (
        select(Asignatura).order_by(Asignatura.id).offset(desplazamiento).limit(limite)
    )

    asignaturas = db.scalars(consulta).all()

    return [AsignaturaSalida.model_validate(asignatura) for asignatura in asignaturas]


def buscar_asignatura(
    db: Session,
    asignatura_id: int,
) -> Asignatura:
    asignatura = db.get(Asignatura, asignatura_id)

    if asignatura is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignatura no encontrada",
        )

    return asignatura


def obtener_asignatura(
    db: Session,
    asignatura_id: int,
) -> AsignaturaSalida:
    asignatura = buscar_asignatura(db, asignatura_id)

    return AsignaturaSalida.model_validate(asignatura)


def crear_asignatura(
    db: Session,
    datos: AsignaturaCrear,
) -> AsignaturaSalida:
    clave_existente = db.scalar(
        select(Asignatura.id).where(Asignatura.clave == datos.clave)
    )

    if clave_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La clave ya está registrada",
        )

    try:
        asignatura = Asignatura(
            clave=datos.clave,
            nombre=datos.nombre,
            activo=True,
        )

        db.add(asignatura)
        db.flush()

        resultado = AsignaturaSalida.model_validate(asignatura)

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La clave ya está registrada",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise


def editar_asignatura(
    db: Session,
    asignatura_id: int,
    datos: AsignaturaEditar,
) -> AsignaturaSalida:
    asignatura = buscar_asignatura(db, asignatura_id)
    cambios = datos.model_dump(exclude_unset=True)

    if "clave" in cambios:
        clave_existente = db.scalar(
            select(Asignatura.id).where(
                Asignatura.clave == cambios["clave"],
                Asignatura.id != asignatura.id,
            )
        )

        if clave_existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La clave ya está registrada",
            )

    try:
        if "clave" in cambios:
            asignatura.clave = cambios["clave"]

        if "nombre" in cambios:
            asignatura.nombre = cambios["nombre"]

        if "activo" in cambios:
            asignatura.activo = cambios["activo"]

        db.flush()

        resultado = AsignaturaSalida.model_validate(asignatura)

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La clave ya está registrada",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise
