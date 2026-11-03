from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.grupo import Grupo
from app.schemas.grupo import GrupoCrear, GrupoEditar, GrupoSalida


def listar_grupos(
    db: Session,
    limite: int,
    desplazamiento: int,
) -> list[GrupoSalida]:
    consulta = select(Grupo).order_by(Grupo.id).offset(desplazamiento).limit(limite)

    return [GrupoSalida.model_validate(grupo) for grupo in db.scalars(consulta).all()]


def buscar_grupo(db: Session, grupo_id: int) -> Grupo:
    grupo = db.get(Grupo, grupo_id)

    if grupo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupo no encontrado",
        )

    return grupo


def obtener_grupo(db: Session, grupo_id: int) -> GrupoSalida:
    return GrupoSalida.model_validate(buscar_grupo(db, grupo_id))


def comprobar_nombre_disponible(
    db: Session,
    nombre: str,
    grupo_id: int | None = None,
) -> None:
    consulta = select(Grupo.id).where(Grupo.nombre == nombre)

    if grupo_id is not None:
        consulta = consulta.where(Grupo.id != grupo_id)

    if db.scalar(consulta) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre del grupo ya está registrado",
        )


def guardar_grupo(db: Session, grupo: Grupo) -> GrupoSalida:
    try:
        db.flush()
        resultado = GrupoSalida.model_validate(grupo)
        db.commit()
        return resultado

    except IntegrityError as error:
        db.rollback()

        if error.orig.args and error.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre del grupo ya está registrado",
            ) from error

        raise

    except SQLAlchemyError:
        db.rollback()
        raise


def crear_grupo(db: Session, datos: GrupoCrear) -> GrupoSalida:
    comprobar_nombre_disponible(db, datos.nombre)

    grupo = Grupo(nombre=datos.nombre, activo=True)
    db.add(grupo)

    return guardar_grupo(db, grupo)


def editar_grupo(
    db: Session,
    grupo_id: int,
    datos: GrupoEditar,
) -> GrupoSalida:
    grupo = buscar_grupo(db, grupo_id)
    cambios = datos.model_dump(exclude_unset=True)

    if "nombre" in cambios:
        comprobar_nombre_disponible(db, cambios["nombre"], grupo_id)
        grupo.nombre = cambios["nombre"]

    if "activo" in cambios:
        grupo.activo = cambios["activo"]

    return guardar_grupo(db, grupo)
