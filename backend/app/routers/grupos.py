from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_administrador
from app.schemas.grupo import GrupoCrear, GrupoEditar, GrupoSalida, GrupoListado
from app.services.grupos import (
    crear_grupo,
    editar_grupo,
    listar_grupos,
    obtener_grupo,
)

router = APIRouter(
    prefix="/grupos",
    tags=["Grupos"],
    dependencies=[Depends(requerir_administrador)],
)


@router.get("", response_model=list[GrupoListado])
def consultar_grupos(
    db: Annotated[Session, Depends(obtener_db)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    return listar_grupos(db, limite, desplazamiento)


@router.get("/{grupo_id}", response_model=GrupoSalida)
def consultar_grupo(
    grupo_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(obtener_db)],
):
    return obtener_grupo(db, grupo_id)


@router.post(
    "",
    response_model=GrupoSalida,
    status_code=status.HTTP_201_CREATED,
)
def registrar_grupo(
    datos: GrupoCrear,
    db: Annotated[Session, Depends(obtener_db)],
):
    return crear_grupo(db, datos)


@router.patch("/{grupo_id}", response_model=GrupoSalida)
def actualizar_grupo(
    grupo_id: Annotated[int, Path(ge=1)],
    datos: GrupoEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_grupo(db, grupo_id, datos)
