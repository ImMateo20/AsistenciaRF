from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel

from app.database import obtener_db
from app.dependencies.auth import requerir_profesor
from app.models.usuario import Usuario
from app.schemas.clase_profesor import ClaseProfesorSalida
from app.services.clases_profesor import listar_clases_del_profesor
from app.models.alumno import Alumno
from app.models.clase import Clase
from app.models.profesor import Profesor

router = APIRouter(prefix="/profesor/clases", tags=["Clases del profesor"])


@router.get("", response_model=list[ClaseProfesorSalida])
def consultar_mis_clases(
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> list[ClaseProfesorSalida]:
    return listar_clases_del_profesor(db, usuario.id)


class AlumnoDeClaseSalida(BaseModel):
    id: int
    nombre: str
    matricula: str


@router.get("/{clase_id}/alumnos", response_model=list[AlumnoDeClaseSalida])
def consultar_alumnos_de_mi_clase(
    clase_id: int,
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> list[AlumnoDeClaseSalida]:
    grupo_id = db.scalar(
        select(Clase.grupo_id)
        .join(Profesor, Profesor.id == Clase.profesor_id)
        .where(Clase.id == clase_id, Profesor.usuario_id == usuario.id)
    )

    if grupo_id is None:
        raise HTTPException(status_code=404, detail="No se encontró esta clase.")

    filas = db.execute(
        select(Alumno.id, Alumno.nombre, Alumno.matricula)
        .where(Alumno.grupo_id == grupo_id)
        .order_by(Alumno.nombre, Alumno.id)
    )

    return [
        AlumnoDeClaseSalida(id=alumno_id, nombre=nombre, matricula=matricula)
        for alumno_id, nombre, matricula in filas
    ]
