from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.profesor import Profesor
from app.models.usuario import Usuario
from app.schemas.profesor import ProfesorCrear, ProfesorEditar, ProfesorSalida
from app.security import generar_hash


def listar_profesores(
    db: Session,
    limite: int,
    desplazamiento: int,
) -> list[ProfesorSalida]:
    consulta = (
        select(Profesor, Usuario)
        .join(Usuario, Profesor.usuario_id == Usuario.id)
        .order_by(Profesor.id)
        .offset(desplazamiento)
        .limit(limite)
    )

    resultados = db.execute(consulta).all()

    return [
        ProfesorSalida(
            id=profesor.id,
            nombre=profesor.nombre,
            matricula=profesor.matricula,
            correo=usuario.correo,
            activo=profesor.activo and usuario.activo,
        )
        for profesor, usuario in resultados
    ]


def registrar_profesor(
    db: Session,
    datos: ProfesorCrear,
) -> ProfesorSalida:
    correo = str(datos.correo).strip().lower()

    correo_existente = db.scalar(select(Usuario.id).where(Usuario.correo == correo))

    if correo_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    matricula_existente = db.scalar(
        select(Profesor.id).where(Profesor.matricula == datos.matricula)
    )

    if matricula_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La matrícula ya está registrada",
        )

    try:
        usuario = Usuario(
            correo=correo,
            password_hash=generar_hash(datos.password.get_secret_value()),
            rol="profesor",
            activo=True,
        )

        db.add(usuario)
        db.flush()

        profesor = Profesor(
            nombre=datos.nombre,
            matricula=datos.matricula,
            usuario_id=usuario.id,
            activo=True,
        )

        db.add(profesor)
        db.flush()

        resultado = ProfesorSalida(
            id=profesor.id,
            nombre=profesor.nombre,
            matricula=profesor.matricula,
            correo=usuario.correo,
            activo=True,
        )

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo o la matrícula ya están registrados",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise


def obtener_profesor(
    db: Session,
    profesor_id: int,
) -> ProfesorSalida:
    consulta = (
        select(Profesor, Usuario)
        .join(Usuario, Profesor.usuario_id == Usuario.id)
        .where(Profesor.id == profesor_id)
    )

    resultado = db.execute(consulta).first()

    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profesor no encontrado",
        )

    profesor, usuario = resultado

    return ProfesorSalida(
        id=profesor.id,
        nombre=profesor.nombre,
        matricula=profesor.matricula,
        correo=usuario.correo,
        activo=profesor.activo and usuario.activo,
    )


def editar_profesor(
    db: Session,
    profesor_id: int,
    datos: ProfesorEditar,
) -> ProfesorSalida:
    profesor = db.get(Profesor, profesor_id)

    if profesor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profesor no encontrado",
        )

    usuario = db.get(Usuario, profesor.usuario_id)

    if usuario is None or usuario.rol != "profesor":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La cuenta vinculada al profesor es inconsistente",
        )

    cambios = datos.model_dump(exclude_unset=True)

    if "correo" in cambios:
        cambios["correo"] = str(cambios["correo"]).strip().lower()

        correo_existente = db.scalar(
            select(Usuario.id).where(
                Usuario.correo == cambios["correo"],
                Usuario.id != usuario.id,
            )
        )

        if correo_existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado",
            )

    if "matricula" in cambios:
        matricula_existente = db.scalar(
            select(Profesor.id).where(
                Profesor.matricula == cambios["matricula"],
                Profesor.id != profesor.id,
            )
        )

        if matricula_existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La matrícula ya está registrada",
            )

    try:
        if "nombre" in cambios:
            profesor.nombre = cambios["nombre"]

        if "matricula" in cambios:
            profesor.matricula = cambios["matricula"]

        if "correo" in cambios:
            usuario.correo = cambios["correo"]

        if "activo" in cambios:
            profesor.activo = cambios["activo"]
            usuario.activo = cambios["activo"]

        db.flush()

        resultado = ProfesorSalida(
            id=profesor.id,
            nombre=profesor.nombre,
            matricula=profesor.matricula,
            correo=usuario.correo,
            activo=profesor.activo and usuario.activo,
        )

        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo o la matrícula ya están registrados",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise
