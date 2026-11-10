from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_profesor
from app.models.alumno import Alumno
from app.models.asignatura import Asignatura
from app.models.asistencia import Asistencia
from app.models.clase import Clase
from app.models.grupo import Grupo
from app.models.profesor import Profesor
from app.models.sesion_clase import SesionClase
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/profesor/asistencias",
    tags=["Historial de asistencias"],
)


def consulta_sesiones(usuario_id: int):
    return (
        select(SesionClase, Clase.grupo_id, Asignatura.nombre, Grupo.nombre)
        .select_from(SesionClase)
        .join(Clase, Clase.id == SesionClase.clase_id)
        .join(Profesor, Profesor.id == Clase.profesor_id)
        .join(Asignatura, Asignatura.id == Clase.asignatura_id)
        .join(Grupo, Grupo.id == Clase.grupo_id)
        .where(Profesor.usuario_id == usuario_id)
    )


def datos_sesion(sesion, asignatura, grupo):
    return {
        "id": sesion.id,
        "clase_id": sesion.clase_id,
        "asignatura": asignatura,
        "grupo": grupo,
        "fecha_inicio": sesion.fecha_inicio,
        "estado": sesion.estado,
    }


@router.get("")
def listar_asistencias(
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
):
    filas = db.execute(
        consulta_sesiones(usuario.id).order_by(
            SesionClase.fecha_inicio.desc(), SesionClase.id.desc()
        )
    )

    return [
        datos_sesion(sesion, asignatura, grupo)
        for sesion, _, asignatura, grupo in filas
    ]


@router.get("/sesiones/{sesion_id}")
def consultar_asistencia(
    sesion_id: Annotated[int, Path(ge=1)],
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
):
    fila = db.execute(
        consulta_sesiones(usuario.id).where(SesionClase.id == sesion_id)
    ).first()

    if fila is None:
        raise HTTPException(status_code=404, detail="No se encontró esta sesión.")

    sesion, grupo_id, asignatura, grupo = fila

    registros = db.execute(
        select(Alumno.id, Alumno.nombre, Alumno.matricula, Asistencia.fecha_registro)
        .select_from(Alumno)
        .outerjoin(
            Asistencia,
            (Asistencia.alumno_id == Alumno.id) & (Asistencia.sesion_id == sesion.id),
        )
        .where(
            or_(
                (Alumno.grupo_id == grupo_id) & Alumno.activo.is_(True),
                Asistencia.id.is_not(None),
            )
        )
        .order_by(Alumno.nombre, Alumno.id)
    )

    return {
        **datos_sesion(sesion, asignatura, grupo),
        "alumnos": [
            {
                "id": alumno_id,
                "nombre": nombre,
                "matricula": matricula,
                "fecha_registro": fecha_registro,
            }
            for alumno_id, nombre, matricula, fecha_registro in registros
        ],
    }
