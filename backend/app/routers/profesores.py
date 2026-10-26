from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_administrador
from app.schemas.profesor import ProfesorCrear, ProfesorEditar, ProfesorSalida
from app.services.profesores import (
    obtener_profesor,
    editar_profesor,
    listar_profesores,
    registrar_profesor,
)

router = APIRouter(
    prefix="/profesores",
    tags=["Profesores"],
    dependencies=[Depends(requerir_administrador)],
)


@router.get("", response_model=list[ProfesorSalida])
def consultar_profesores(
    db: Annotated[Session, Depends(obtener_db)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    return listar_profesores(db, limite, desplazamiento)


@router.post(
    "",
    response_model=ProfesorSalida,
    status_code=status.HTTP_201_CREATED,
)
def crear_profesor(
    datos: ProfesorCrear,
    db: Annotated[Session, Depends(obtener_db)],
):
    return registrar_profesor(db, datos)


@router.patch("/{profesor_id}", response_model=ProfesorSalida)
def actualizar_profesor(
    profesor_id: Annotated[int, Path(ge=1)],
    datos: ProfesorEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_profesor(db, profesor_id, datos)


@router.get("/{profesor_id}", response_model=ProfesorSalida)
def consultar_profesor(
    profesor_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return obtener_profesor(db, profesor_id)
