from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_administrador
from app.schemas.clase import ClaseCrear, ClaseEditar, ClaseSalida
from app.schemas.horario_clase import HorarioBloqueSalida
from app.services.clases import (
    crear_clase,
    editar_clase,
    listar_clases,
    obtener_clase,
    listar_horarios_clase,
)

router = APIRouter(
    prefix="/clases",
    tags=["Clases"],
    dependencies=[Depends(requerir_administrador)],
)


@router.get("", response_model=list[ClaseSalida])
def consultar_clases(
    db: Annotated[Session, Depends(obtener_db)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    return listar_clases(db, limite, desplazamiento)


@router.get("/{clase_id}", response_model=ClaseSalida)
def consultar_clase(
    clase_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return obtener_clase(db, clase_id)


@router.post(
    "",
    response_model=ClaseSalida,
    status_code=status.HTTP_201_CREATED,
)
def registrar_clase(
    datos: ClaseCrear,
    db: Annotated[Session, Depends(obtener_db)],
):
    return crear_clase(db, datos)


@router.patch("/{clase_id}", response_model=ClaseSalida)
def actualizar_clase(
    clase_id: Annotated[int, Path(ge=1)],
    datos: ClaseEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_clase(db, clase_id, datos)


@router.get(
    "/{clase_id}/horarios",
    response_model=list[HorarioBloqueSalida],
)
def consultar_horarios_clase(
    clase_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return listar_horarios_clase(db, clase_id)
