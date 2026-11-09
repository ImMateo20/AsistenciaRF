from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

IdPositivo = Annotated[int, Field(gt=0, strict=True)]


class ClaseCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asignatura_id: IdPositivo
    grupo_id: IdPositivo
    profesor_id: IdPositivo


class ClaseEditar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asignatura_id: IdPositivo | None = None
    grupo_id: IdPositivo | None = None
    profesor_id: IdPositivo | None = None
    activo: bool | None = None

    @model_validator(mode="after")
    def comprobar_campos(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos un campo para actualizar")

        for campo in self.model_fields_set:
            if getattr(self, campo) is None:
                raise ValueError(f"El campo {campo} no admite null")

        return self


class ClaseSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asignatura_id: int
    grupo_id: int
    profesor_id: int
    activo: bool
