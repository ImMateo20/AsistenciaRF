from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.alumno import Alumno
from app.schemas.alumno import (
    AlumnoCrear,
    AlumnoEditar,
    AlumnoSalida,
)


def listar_alumnos(
    db: Session,
    limite: int,
    desplazamiento: int,
) -> list[AlumnoSalida]:
    consulta = select(Alumno).order_by(Alumno.id).offset(desplazamiento).limit(limite)

    alumnos = db.scalars(consulta).all()

    return [AlumnoSalida.model_validate(alumno) for alumno in alumnos]


def buscar_alumno(db: Session, alumno_id: int) -> Alumno:
    alumno = db.get(Alumno, alumno_id)

    if alumno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumno no encontrado",
        )

    return alumno


def obtener_alumno(
    db: Session,
    alumno_id: int,
) -> AlumnoSalida:
    alumno = buscar_alumno(db, alumno_id)

    return AlumnoSalida.model_validate(alumno)


def registrar_alumno(
    db: Session,
    datos: AlumnoCrear,
) -> AlumnoSalida:
    matricula_existente = db.scalar(
        select(Alumno.id).where(Alumno.matricula == datos.matricula)
    )

    if matricula_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La matrícula ya está registrada",
        )

    try:
        alumno = Alumno(
            nombre=datos.nombre,
            matricula=datos.matricula,
            activo=True,
        )

        db.add(alumno)
        db.flush()

        resultado = AlumnoSalida.model_validate(alumno)

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La matrícula ya está registrada",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise


def editar_alumno(
    db: Session,
    alumno_id: int,
    datos: AlumnoEditar,
) -> AlumnoSalida:
    alumno = buscar_alumno(db, alumno_id)
    cambios = datos.model_dump(exclude_unset=True)

    if "matricula" in cambios:
        matricula_existente = db.scalar(
            select(Alumno.id).where(
                Alumno.matricula == cambios["matricula"],
                Alumno.id != alumno.id,
            )
        )

        if matricula_existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La matrícula ya está registrada",
            )

    try:
        if "nombre" in cambios:
            alumno.nombre = cambios["nombre"]

        if "matricula" in cambios:
            alumno.matricula = cambios["matricula"]

        if "activo" in cambios:
            alumno.activo = cambios["activo"]

        db.flush()

        resultado = AlumnoSalida.model_validate(alumno)

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La matrícula ya está registrada",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise
