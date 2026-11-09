from datetime import time
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator


DiaSemana = Annotated[int, Field(ge=1, le=7, strict=True)]


class BloqueHorario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def comprobar_horas(self):
        if self.hora_inicio.tzinfo is not None or self.hora_fin.tzinfo is not None:
            raise ValueError("Envía las horas sin zona horaria.")

        if self.hora_fin <= self.hora_inicio:
            raise ValueError("La hora de fin debe ser posterior a la de inicio.")

        return self


class HorarioActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bloques: list[BloqueHorario] = Field(min_length=1)

    @model_validator(mode="after")
    def comprobar_traslapes(self):
        ordenados = sorted(
            self.bloques,
            key=lambda bloque: (bloque.dia_semana, bloque.hora_inicio),
        )

        for anterior, actual in zip(ordenados, ordenados[1:]):
            if (
                anterior.dia_semana == actual.dia_semana
                and actual.hora_inicio < anterior.hora_fin
            ):
                raise ValueError(
                    f"Hay bloques de horario que se traslapan en el día "
                    f"{actual.dia_semana}."
                )

        return self


class HorarioBloqueSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dia_semana: int
    hora_inicio: time
    hora_fin: time