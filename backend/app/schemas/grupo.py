from typing import Annotated
from pydantic import Field, field_validator
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

    alumno_ids: list[Annotated[int, Field(gt=0, strict=True)]] = Field(
        default_factory=list,
    )

    @field_validator("alumno_ids")
    @classmethod
    def comprobar_alumnos_unicos(cls, alumno_ids: list[int]) -> list[int]:
        if len(alumno_ids) != len(set(alumno_ids)):
            raise ValueError("No puedes seleccionar el mismo alumno más de una vez.")
        return alumno_ids


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

    alumno_ids: list[Annotated[int, Field(gt=0, strict=True)]] | None = None

    @field_validator("alumno_ids")
    @classmethod
    def comprobar_alumnos_unicos(cls, alumno_ids: list[int] | None) -> list[int] | None:
        if alumno_ids is not None and len(alumno_ids) != len(set(alumno_ids)):
            raise ValueError("No puedes seleccionar el mismo alumno más de una vez.")
        return alumno_ids


class GrupoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    activo: bool


class GrupoListado(GrupoSalida):
    cantidad_alumnos: int
