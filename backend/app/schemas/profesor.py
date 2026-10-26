from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    StringConstraints,
    model_validator,
)

NombreProfesor = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=150,
    ),
]

MatriculaProfesor = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=20,
        pattern=r"^[0-9]+$",
    ),
]


class ProfesorCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreProfesor
    matricula: MatriculaProfesor
    correo: EmailStr
    password: SecretStr = Field(min_length=12, max_length=128)


class ProfesorEditar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreProfesor | None = None
    matricula: MatriculaProfesor | None = None
    correo: EmailStr | None = None
    activo: bool | None = None

    @model_validator(mode="after")
    def comprobar_campos(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos un campo para actualizar")

        for campo in self.model_fields_set:
            if getattr(self, campo) is None:
                raise ValueError(f"El campo {campo} no admite null")

        return self


class ProfesorSalida(BaseModel):
    id: int
    nombre: str
    matricula: str
    correo: EmailStr
    activo: bool
