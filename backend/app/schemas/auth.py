from typing import Literal

from pydantic import BaseModel, EmailStr, Field, SecretStr


class LoginEntrada(BaseModel):
    correo: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)


class TokenSalida(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UsuarioSalida(BaseModel):
    id: int
    correo: EmailStr
    rol: Literal["administrador", "profesor"]
    activo: bool
