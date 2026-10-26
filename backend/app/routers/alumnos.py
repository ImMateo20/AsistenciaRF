from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    Query,
    UploadFile,
    status,
)
from pydantic import ValidationError

from app.services.facial import MAX_BYTES_IMAGEN
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
    nombre: Annotated[
        str,
        Form(min_length=1, max_length=150),
    ],
    matricula: Annotated[
        str,
        Form(min_length=1, max_length=20),
    ],
    imagenes: Annotated[list[UploadFile], File()],
    db: Annotated[Session, Depends(obtener_db)],
):
    try:
        if len(imagenes) != 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debes enviar tres capturas del rostro",
            )

        try:
            datos = AlumnoCrear(
                nombre=nombre,
                matricula=matricula,
            )
        except ValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Revisa el nombre y la matrícula del alumno",
            ) from error

        contenidos = []

        for numero, imagen in enumerate(imagenes, start=1):
            contenido = imagen.file.read(MAX_BYTES_IMAGEN + 1)

            if len(contenido) > MAX_BYTES_IMAGEN:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"La captura {numero} supera los 5 MB",
                )

            contenidos.append(contenido)

        return registrar_alumno(db, datos, contenidos)

    finally:
        for imagen in imagenes:
            imagen.file.close()


@router.patch("/{alumno_id}", response_model=AlumnoSalida)
def actualizar_alumno(
    alumno_id: Annotated[int, Path(ge=1)],
    datos: AlumnoEditar,
    db: Annotated[Session, Depends(obtener_db)],
):
    return editar_alumno(db, alumno_id, datos)
