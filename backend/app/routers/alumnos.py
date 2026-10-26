from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_administrador
from app.schemas.alumno import (
    AlumnoCrear,
    AlumnoEditar,
    AlumnoSalida,
)
from app.services.alumnos import (
    editar_alumno,
    listar_alumnos,
    obtener_alumno,
    registrar_alumno,
)

router = APIRouter(
    prefix="/alumnos",
    tags=["Alumnos"],
    dependencies=[Depends(requerir_administrador)],
)


@router.get("", response_model=list[AlumnoSalida])
def consultar_alumnos(
    db: Annotated[Session, Depends(obtener_db)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    return listar_alumnos(db, limite, desplazamiento)


@router.get("/{alumno_id}", response_model=AlumnoSalida)
def consultar_alumno(
    alumno_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return obtener_alumno(db, alumno_id)


@router.post(
    "",
    response_model=AlumnoSalida,
    status_code=status.HTTP_201_CREATED,
)
def crear_alumno(
    datos: AlumnoCrear,
    db: Annotated[Session, Depends(obtener_db)],
):
    return registrar_alumno(db, datos)


@router.patch("/{alumno_id}", response_model=AlumnoSalida)
def actualizar_alumno(
    alumno_id: Annotated[int, Path(ge=1)],
    datos: AlumnoEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_alumno(db, alumno_id, datos)
