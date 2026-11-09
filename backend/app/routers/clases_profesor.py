from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_profesor
from app.models.usuario import Usuario
from app.schemas.clase_profesor import ClaseProfesorSalida
from app.services.clases_profesor import listar_clases_del_profesor

router = APIRouter(prefix="/profesor/clases", tags=["Clases del profesor"])


@router.get("", response_model=list[ClaseProfesorSalida])
def consultar_mis_clases(
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> list[ClaseProfesorSalida]:
    return listar_clases_del_profesor(db, usuario.id)
