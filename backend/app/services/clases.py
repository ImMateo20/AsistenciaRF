from fastapi import HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from datetime import date
from sqlalchemy.dialects.mysql import insert

from app.models.horario_clase import HorarioClase
from app.schemas.horario_clase import BloqueHorario, HorarioBloqueSalida
from app.services.horarios_clase import comprobar_horario_de_clase
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


def guardar_clase(
    db: Session,
    clase: Clase,
    bloques: list[BloqueHorario] | None = None,
) -> ClaseSalida:
    try:
        db.flush()

        if bloques:
            db.add_all(
                [
                    HorarioClase(clase_id=clase.id, **bloque.model_dump())
                    for bloque in bloques
                ]
            )
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


def obtener_periodo_predeterminado(db: Session) -> int:
    nombre = "2026B"

    consulta = select(PeriodoEscolar.id).where(PeriodoEscolar.nombre == nombre)
    periodo_id = db.execute(consulta).scalar_one_or_none()

    if periodo_id is not None:
        return periodo_id

    sentencia = insert(PeriodoEscolar).values(
        nombre=nombre,
        fecha_inicio=date(2026, 8, 1),
        fecha_fin=date(2026, 12, 31),
        activo=True,
    )

    # Si otra solicitud acaba de crearlo, conserva el registro existente.
    db.execute(sentencia.on_duplicate_key_update(nombre=PeriodoEscolar.nombre))

    return db.execute(consulta.with_for_update()).scalar_one()


def crear_clase(db: Session, datos: ClaseCrear) -> ClaseSalida:
    periodo_id = obtener_periodo_predeterminado(db)
    campos = datos.model_dump(exclude={"bloques"})
    campos["periodo_id"] = periodo_id

    validar_referencias(db, **campos)

    comprobar_horario_de_clase(
        db,
        grupo_id=datos.grupo_id,
        profesor_id=datos.profesor_id,
        bloques=datos.bloques,
    )

    comprobar_clase_duplicada(
        db,
        asignatura_id=datos.asignatura_id,
        grupo_id=datos.grupo_id,
        periodo_id=periodo_id,
    )

    clase = Clase(**campos)
    db.add(clase)
    return guardar_clase(db, clase, datos.bloques)


def editar_clase(db: Session, clase_id: int, datos: ClaseEditar) -> ClaseSalida:
    try:
        clase = buscar_clase(db, clase_id)
        db.refresh(clase, with_for_update=True)

        cambios = datos.model_dump(exclude_unset=True, exclude={"bloques"})

        asignatura_id = cambios.get("asignatura_id", clase.asignatura_id)
        grupo_id = cambios.get("grupo_id", clase.grupo_id)
        profesor_id = cambios.get("profesor_id", clase.profesor_id)
        activo = cambios.get("activo", clase.activo)

        validar_referencias(
            db,
            asignatura_id=asignatura_id,
            grupo_id=grupo_id,
            profesor_id=profesor_id,
            periodo_id=clase.periodo_id,
        )

        comprobar_clase_duplicada(
            db,
            asignatura_id=asignatura_id,
            grupo_id=grupo_id,
            periodo_id=clase.periodo_id,
            excluir_clase_id=clase.id,
        )

        debe_revisar_horario = activo and (
            datos.bloques is not None
            or grupo_id != clase.grupo_id
            or profesor_id != clase.profesor_id
            or not clase.activo
        )

        if debe_revisar_horario:
            bloques_para_revisar = datos.bloques

            if bloques_para_revisar is None:
                horarios_actuales = db.scalars(
                    consulta_horarios(clase.id).with_for_update()
                ).all()

                bloques_para_revisar = [
                    BloqueHorario(
                        dia_semana=horario.dia_semana,
                        hora_inicio=horario.hora_inicio,
                        hora_fin=horario.hora_fin,
                    )
                    for horario in horarios_actuales
                ]

            comprobar_horario_de_clase(
                db,
                grupo_id=grupo_id,
                profesor_id=profesor_id,
                bloques=bloques_para_revisar,
                excluir_clase_id=clase.id,
            )

        if datos.bloques is not None:
            db.execute(delete(HorarioClase).where(HorarioClase.clase_id == clase.id))

        for campo, valor in cambios.items():
            setattr(clase, campo, valor)

        return guardar_clase(db, clase, datos.bloques)

    except (HTTPException, SQLAlchemyError):
        db.rollback()
        raise


def consulta_horarios(clase_id: int):
    return (
        select(HorarioClase)
        .where(HorarioClase.clase_id == clase_id)
        .order_by(HorarioClase.dia_semana, HorarioClase.hora_inicio)
    )


def listar_horarios_clase(
    db: Session,
    clase_id: int,
) -> list[HorarioBloqueSalida]:
    buscar_clase(db, clase_id)
    horarios = db.scalars(consulta_horarios(clase_id)).all()

    return [HorarioBloqueSalida.model_validate(horario) for horario in horarios]
