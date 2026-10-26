from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    model_validator,
)

NombreAlumno = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=150,
    ),
]

MatriculaAlumno = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=20,
        pattern=r"^[0-9]+$",
    ),
]


class AlumnoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreAlumno
    matricula: MatriculaAlumno


class AlumnoEditar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreAlumno | None = None
    matricula: MatriculaAlumno | None = None
    activo: bool | None = None

    @model_validator(mode="after")
    def comprobar_campos(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos un campo para actualizar")

        for campo in self.model_fields_set:
            if getattr(self, campo) is None:
                raise ValueError(f"El campo {campo} no admite null")

        return self


class AlumnoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    matricula: str
    activo: bool
