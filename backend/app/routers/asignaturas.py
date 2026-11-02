from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_administrador
from app.schemas.asignatura import (
    AsignaturaCrear,
    AsignaturaEditar,
    AsignaturaSalida,
)
from app.services.asignaturas import (
    crear_asignatura,
    editar_asignatura,
    listar_asignaturas,
    obtener_asignatura,
)


router = APIRouter(
    prefix="/asignaturas",
    tags=["Asignaturas"],
    dependencies=[Depends(requerir_administrador)],
)


@router.get("", response_model=list[AsignaturaSalida])
def consultar_asignaturas(
    db: Annotated[Session, Depends(obtener_db)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    return listar_asignaturas(db, limite, desplazamiento)


@router.get("/{asignatura_id}", response_model=AsignaturaSalida)
def consultar_asignatura(
    asignatura_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return obtener_asignatura(db, asignatura_id)


@router.post(
    "",
    response_model=AsignaturaSalida,
    status_code=status.HTTP_201_CREATED,
)
def registrar_asignatura(
    datos: AsignaturaCrear,
    db: Annotated[Session, Depends(obtener_db)],
):
    return crear_asignatura(db, datos)


@router.patch("/{asignatura_id}", response_model=AsignaturaSalida)
def actualizar_asignatura(
    asignatura_id: Annotated[int, Path(ge=1)],
    datos: AsignaturaEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_asignatura(db, asignatura_id, datos)