import cv2

from app.models.rostro_alumno import RostroAlumno
from app.services.facial import (
    ErrorImagenFacial,
    VERSION_MODELO,
    obtener_motor_facial,
    validar_coherencia_capturas,
)

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
    imagenes: list[bytes],
) -> AlumnoSalida:
    if len(imagenes) != 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se necesitan tres capturas del rostro",
        )

    matricula_existente = db.scalar(
        select(Alumno.id).where(Alumno.matricula == datos.matricula)
    )

    if matricula_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La matrícula ya está registrada",
        )

    # Procesamos todas las imágenes antes de crear al alumno
    representaciones = []

    try:
        motor = obtener_motor_facial()

        for numero, imagen in enumerate(imagenes, start=1):
            try:
                representacion = motor.obtener_representacion(imagen)
            except ErrorImagenFacial as error:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Captura {numero}: {error}",
                ) from error

            representaciones.append(representacion)

    except (RuntimeError, cv2.error) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El procesamiento facial no está disponible. Intenta más tarde.",
        ) from error

    try:
        validar_coherencia_capturas(representaciones)
    except ErrorImagenFacial as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    try:
        alumno = Alumno(
            nombre=datos.nombre,
            matricula=datos.matricula,
            activo=True,
        )

        db.add(alumno)
        db.flush()

        for numero, representacion in enumerate(
            representaciones,
            start=1,
        ):
            rostro = RostroAlumno(
                alumno_id=alumno.id,
                numero_muestra=numero,
                representacion=representacion,
                version_modelo=VERSION_MODELO,
            )

            db.add(rostro)

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
