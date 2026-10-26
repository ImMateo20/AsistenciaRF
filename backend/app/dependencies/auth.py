from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.tokens import leer_token_acceso

esquema_bearer = HTTPBearer(auto_error=False)


def obtener_token_actual(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(esquema_bearer),
    ],
) -> dict:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Necesitas iniciar sesión nuevamente",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credenciales is None:
        raise error

    try:
        return leer_token_acceso(credenciales.credentials)
    except InvalidTokenError:
        raise error


def obtener_usuario_actual(
    datos_token: Annotated[dict, Depends(obtener_token_actual)],
    db: Annotated[Session, Depends(obtener_db)],
) -> Usuario:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Necesitas iniciar sesión nuevamente",
        headers={"WWW-Authenticate": "Bearer"},
    )

    revocado = db.get(TokenRevocado, datos_token["jti"])

    if revocado is not None:
        raise error

    usuario = db.get(Usuario, int(datos_token["sub"]))

    if usuario is None or not usuario.activo:
        raise error

    return usuario


def requerir_administrador(
    usuario: Annotated[Usuario, Depends(obtener_usuario_actual)],
) -> Usuario:
    if usuario.rol != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para realizar esta acción",
        )

    return usuario
