from typing import Annotated

from fastapi import APIRouter, Depends, Path, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import requerir_profesor
from app.models.usuario import Usuario
from app.schemas.sesion_clase import SesionClaseSalida, ResultadoReconocimientoSalida
from app.services.sesiones_clase import abrir_sesion, cerrar_sesion

from app.services.asistencia_facial import registrar_asistencia_facial
from app.services.facial import MAX_BYTES_IMAGEN

router = APIRouter(prefix="/profesor/clases", tags=["Sesiones de asistencia"])


@router.post("/{clase_id}/sesiones", response_model=SesionClaseSalida)
def abrir_sesion_de_clase(
    clase_id: Annotated[int, Path(ge=1)],
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> SesionClaseSalida:
    return abrir_sesion(db, clase_id=clase_id, usuario_id=usuario.id)


@router.patch(
    "/{clase_id}/sesiones/{sesion_id}/cerrar",
    response_model=SesionClaseSalida,
)
def cerrar_sesion_de_clase(
    clase_id: Annotated[int, Path(ge=1)],
    sesion_id: Annotated[int, Path(ge=1)],
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> SesionClaseSalida:
    return cerrar_sesion(
        db,
        clase_id=clase_id,
        sesion_id=sesion_id,
        usuario_id=usuario.id,
    )


@router.post(
    "/{clase_id}/sesiones/{sesion_id}/reconocer",
    response_model=ResultadoReconocimientoSalida,
)
def reconocer_alumno(
    clase_id: Annotated[int, Path(ge=1)],
    sesion_id: Annotated[int, Path(ge=1)],
    imagen: Annotated[UploadFile, File()],
    usuario: Annotated[Usuario, Depends(requerir_profesor)],
    db: Annotated[Session, Depends(obtener_db)],
) -> ResultadoReconocimientoSalida:
    try:
        contenido = imagen.file.read(MAX_BYTES_IMAGEN + 1)

        if len(contenido) > MAX_BYTES_IMAGEN:
            raise HTTPException(
                status_code=413,
                detail="La captura supera el límite de 5 MiB.",
            )

        return registrar_asistencia_facial(
            db,
            clase_id=clase_id,
            sesion_id=sesion_id,
            usuario_id=usuario.id,
            contenido=contenido,
        )
    finally:
        imagen.file.close()
