from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.asignatura import Asignatura
from app.models.clase import Clase
from app.models.grupo import Grupo
from app.models.periodo import PeriodoEscolar
from app.models.profesor import Profesor
from app.schemas.clase import ClaseCrear, ClaseEditar, ClaseSalida

RESTRICCION_CLASE_UNICA = "uq_clases_asignatura_grupo_periodo"
MENSAJE_CLASE_DUPLICADA = "Ya existe una clase para esta asignatura, grupo y periodo."


def listar_clases(db: Session, limite: int, desplazamiento: int) -> list[ClaseSalida]:
    consulta = select(Clase).order_by(Clase.id).offset(desplazamiento).limit(limite)

    return [ClaseSalida.model_validate(clase) for clase in db.scalars(consulta)]


def buscar_clase(db: Session, clase_id: int) -> Clase:
    clase = db.get(Clase, clase_id)

    if clase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clase no encontrada.",
        )

    return clase


def obtener_clase(db: Session, clase_id: int) -> ClaseSalida:
    return ClaseSalida.model_validate(buscar_clase(db, clase_id))


def validar_referencias(
    db: Session,
    *,
    asignatura_id: int,
    grupo_id: int,
    profesor_id: int,
    periodo_id: int,
) -> None:
    referencias = (
        (Asignatura, asignatura_id, "La asignatura"),
        (Grupo, grupo_id, "El grupo"),
        (Profesor, profesor_id, "El profesor"),
        (PeriodoEscolar, periodo_id, "El periodo escolar"),
    )

    for modelo, identificador, nombre in referencias:
        if db.get(modelo, identificador) is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{nombre} no existe.",
            )


def comprobar_clase_duplicada(
    db: Session,
    *,
    asignatura_id: int,
    grupo_id: int,
    periodo_id: int,
    excluir_clase_id: int | None = None,
) -> None:
    consulta = select(Clase.id).where(
        Clase.asignatura_id == asignatura_id,
        Clase.grupo_id == grupo_id,
        Clase.periodo_id == periodo_id,
    )

    if excluir_clase_id is not None:
        consulta = consulta.where(Clase.id != excluir_clase_id)

    if db.scalar(consulta) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=MENSAJE_CLASE_DUPLICADA,
        )


def guardar_clase(db: Session, clase: Clase) -> ClaseSalida:
    try:
        db.flush()
        resultado = ClaseSalida.model_validate(clase)
        db.commit()
        return resultado
    except IntegrityError as error:
        db.rollback()

        argumentos = error.orig.args
        if (
            argumentos
            and argumentos[0] == 1062
            and RESTRICCION_CLASE_UNICA in str(error.orig)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=MENSAJE_CLASE_DUPLICADA,
            ) from error

        if argumentos and argumentos[0] == 1452:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Uno de los registros relacionados ya no existe.",
            ) from error

        raise
    except SQLAlchemyError:
        db.rollback()
        raise


def crear_clase(db: Session, datos: ClaseCrear) -> ClaseSalida:
    campos = datos.model_dump()
    validar_referencias(db, **campos)

    comprobar_clase_duplicada(
        db,
        asignatura_id=datos.asignatura_id,
        grupo_id=datos.grupo_id,
        periodo_id=datos.periodo_id,
    )

    clase = Clase(**campos)
    db.add(clase)
    return guardar_clase(db, clase)


def editar_clase(db: Session, clase_id: int, datos: ClaseEditar) -> ClaseSalida:
    clase = buscar_clase(db, clase_id)
    cambios = datos.model_dump(exclude_unset=True)

    asignatura_id = cambios.get("asignatura_id", clase.asignatura_id)
    grupo_id = cambios.get("grupo_id", clase.grupo_id)
    profesor_id = cambios.get("profesor_id", clase.profesor_id)
    periodo_id = cambios.get("periodo_id", clase.periodo_id)

    validar_referencias(
        db,
        asignatura_id=asignatura_id,
        grupo_id=grupo_id,
        profesor_id=profesor_id,
        periodo_id=periodo_id,
    )

    comprobar_clase_duplicada(
        db,
        asignatura_id=asignatura_id,
        grupo_id=grupo_id,
        periodo_id=periodo_id,
        excluir_clase_id=clase.id,
    )

    for campo, valor in cambios.items():
        setattr(clase, campo, valor)

    return guardar_clase(db, clase)
