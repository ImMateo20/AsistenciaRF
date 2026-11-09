from pydantic import BaseModel, Field

from app.schemas.horario_clase import HorarioBloqueSalida


class ClaseProfesorSalida(BaseModel):
    id: int
    asignatura: str
    grupo: str
    activo: bool
    horarios: list[HorarioBloqueSalida] = Field(default_factory=list)
