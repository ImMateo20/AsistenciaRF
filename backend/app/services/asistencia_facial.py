import cv2
import numpy as np
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alumno import Alumno
from app.models.asistencia import Asistencia
from app.models.rostro_alumno import RostroAlumno
from app.models.sesion_clase import SesionClase
from app.schemas.sesion_clase import ResultadoReconocimientoSalida
from app.services.facial import (
    ErrorImagenFacial,
    VERSION_MODELO,
    obtener_motor_facial,
)
from app.services.sesiones_clase import obtener_clase_propia

# Valores iniciales para probar el flujo con capturas reales.
UMBRAL_RECONOCIMIENTO = 0.363
MARGEN_MINIMO = 0.05


def registrar_asistencia_facial(
    db: Session,
    *,
    clase_id: int,
    sesion_id: int,
    usuario_id: int,
    contenido: bytes,
) -> ResultadoReconocimientoSalida:
    clase = obtener_clase_propia(db, clase_id=clase_id, usuario_id=usuario_id)

    sesion = db.scalar(
        select(SesionClase)
        .where(
            SesionClase.id == sesion_id,
            SesionClase.clase_id == clase.id,
        )
        .with_for_update()
    )

    if sesion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró esta sesión.",
        )

    if sesion.estado != "abierta" or not clase.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La sesión no está disponible para tomar asistencia.",
        )

    try:
        captura = np.asarray(
            obtener_motor_facial().obtener_representacion(contenido),
            dtype=np.float32,
        )
    except ErrorImagenFacial as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except (RuntimeError, cv2.error) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El reconocimiento facial no está disponible.",
        ) from error

    filas = db.execute(
        select(Alumno.id, Alumno.nombre, Alumno.matricula, RostroAlumno.representacion)
        .select_from(Alumno)
        .join(RostroAlumno, RostroAlumno.alumno_id == Alumno.id)
        .where(
            Alumno.grupo_id == clase.grupo_id,
            Alumno.activo.is_(True),
            RostroAlumno.version_modelo == VERSION_MODELO,
        )
    )

    mejores: dict[int, tuple[float, str, str]] = {}

    for alumno_id, nombre, matricula, representacion in filas:
        try:
            muestra = np.asarray(representacion, dtype=np.float32)
        except (TypeError, ValueError, OverflowError):
            continue

        if muestra.shape != captura.shape or not np.isfinite(muestra).all():
            continue

        norma = float(np.linalg.norm(muestra))
        if not np.isfinite(norma) or norma <= 0:
            continue

        similitud = float(np.dot(captura, muestra / norma))
        anterior = mejores.get(alumno_id)

        if anterior is None or similitud > anterior[0]:
            mejores[alumno_id] = (similitud, nombre, matricula)

    ordenados = sorted(
        mejores.items(),
        key=lambda candidato: candidato[1][0],
        reverse=True,
    )

    if (
        not ordenados
        or ordenados[0][1][0] < UMBRAL_RECONOCIMIENTO
        or (
            len(ordenados) > 1
            and ordenados[0][1][0] - ordenados[1][1][0] < MARGEN_MINIMO
        )
    ):
        return ResultadoReconocimientoSalida(
            estado="sin_coincidencia",
            mensaje="No se encontró una coincidencia clara. Intenta otra captura.",
        )

    alumno_id, (_, nombre, matricula) = ordenados[0]

    asistencia_id = db.scalar(
        select(Asistencia.id)
        .where(
            Asistencia.sesion_id == sesion.id,
            Asistencia.alumno_id == alumno_id,
        )
        .with_for_update()
    )

    if asistencia_id is not None:
        return ResultadoReconocimientoSalida(
            estado="ya_registrada",
            mensaje="El alumno ya tiene asistencia en esta sesión",
            alumno_id=alumno_id,
            nombre=nombre,
            matricula=matricula,
        )

    db.add(Asistencia(sesion_id=sesion.id, alumno_id=alumno_id))
    db.commit()

    return ResultadoReconocimientoSalida(
        estado="registrada",
        mensaje="Asistencia registrada correctamente.",
        alumno_id=alumno_id,
        nombre=nombre,
        matricula=matricula,
    )
