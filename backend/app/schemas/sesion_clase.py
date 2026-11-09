from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class SesionClaseSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clase_id: int
    estado: Literal["abierta", "cerrada"]
    fecha_inicio: datetime
    fecha_cierre: datetime | None


class ResultadoReconocimientoSalida(BaseModel):
    estado: Literal["registrada", "ya_registrada", "sin_coincidencia"]
    mensaje: str
    alumno_id: int | None = None
    nombre: str | None = None
    matricula: str | None = None
