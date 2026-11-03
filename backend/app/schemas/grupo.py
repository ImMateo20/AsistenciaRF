from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    model_validator,
)

NombreGrupo = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=50,
    ),
]


class GrupoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreGrupo


class GrupoEditar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreGrupo | None = None
    activo: bool | None = None

    @model_validator(mode="after")
    def comprobar_campos(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos un campo para actualizar")

        for campo in self.model_fields_set:
            if getattr(self, campo) is None:
                raise ValueError(f"El campo {campo} no admite null")

        return self


class GrupoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    activo: bool
