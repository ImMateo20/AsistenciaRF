from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.schemas.grupo import GrupoCrear, GrupoEditar, GrupoSalida, GrupoListado


def listar_grupos(
    db: Session,
    limite: int,
    desplazamiento: int,
) -> list[GrupoListado]:
    consulta = select(Grupo).order_by(Grupo.id).offset(desplazamiento).limit(limite)

    return [
        GrupoListado(
            **GrupoSalida.model_validate(grupo).model_dump(),
            cantidad_alumnos=grupo.cantidad_alumnos or 0,
        )
        for grupo in db.scalars(consulta).all()
    ]


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


def guardar_grupo(
    db: Session,
    grupo: Grupo,
    alumnos: list[Alumno] | None = None,
) -> GrupoSalida:
    try:
        db.flush()
        if alumnos:
            for alumno in alumnos:
                alumno.grupo_id = grupo.id
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

    alumnos = []

    if datos.alumno_ids:
        consulta = (
            select(Alumno)
            .where(Alumno.id.in_(datos.alumno_ids))
            .order_by(Alumno.id)
            .with_for_update()
        )
        alumnos = db.scalars(consulta).all()

        if len(alumnos) != len(datos.alumno_ids):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Uno o más alumnos seleccionados no existen.",
            )

        if any(alumno.grupo_id is not None for alumno in alumnos):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Uno o más alumnos ya pertenecen a otro grupo.",
            )

    grupo = Grupo(nombre=datos.nombre, activo=True)
    db.add(grupo)

    return guardar_grupo(db, grupo, alumnos)


def editar_grupo(
    db: Session,
    grupo_id: int,
    datos: GrupoEditar,
) -> GrupoSalida:
    grupo = db.scalar(select(Grupo).where(Grupo.id == grupo_id).with_for_update())

    if grupo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupo no encontrado",
        )

    cambios = datos.model_dump(exclude_unset=True)
    alumno_ids = cambios.pop("alumno_ids", None)

    if "nombre" in cambios:
        comprobar_nombre_disponible(db, cambios["nombre"], grupo_id)

    if alumno_ids is not None:
        seleccionados = set(alumno_ids)
        consulta = (
            select(Alumno)
            .where(
                or_(
                    Alumno.grupo_id == grupo_id,
                    Alumno.id.in_(seleccionados),
                )
            )
            .order_by(Alumno.id)
            .with_for_update()
        )
        alumnos = db.scalars(consulta).all()
        alumnos_por_id = {alumno.id: alumno for alumno in alumnos}

        if not seleccionados.issubset(alumnos_por_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Uno o más alumnos seleccionados no existen.",
            )

        if any(
            alumnos_por_id[alumno_id].grupo_id not in (None, grupo_id)
            for alumno_id in seleccionados
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Uno o más alumnos ya pertenecen a otro grupo.",
            )

        for alumno in alumnos:
            alumno.grupo_id = grupo_id if alumno.id in seleccionados else None

    if "nombre" in cambios:
        grupo.nombre = cambios["nombre"]

    if "activo" in cambios:
        grupo.activo = cambios["activo"]

    return guardar_grupo(db, grupo)
