from secrets import token_urlsafe
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.dependencies.auth import obtener_usuario_actual
from app.schemas.auth import UsuarioSalida
from app.config import configuracion
from app.database import obtener_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginEntrada, TokenSalida
from app.security import generar_hash, verificar_password
from app.tokens import crear_token_acceso
from datetime import datetime, timezone
from app.dependencies.auth import obtener_token_actual
from app.models.token_revocado import TokenRevocado

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
)

HASH_FICTICIO = generar_hash(token_urlsafe(32))


@router.post("/login", response_model=TokenSalida)
def iniciar_sesion(
    datos: LoginEntrada,
    response: Response,
    db: Annotated[Session, Depends(obtener_db)],
):
    correo = str(datos.correo).strip().lower()

    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))

    hash_a_verificar = usuario.password_hash if usuario is not None else HASH_FICTICIO

    password_valida = verificar_password(
        datos.password.get_secret_value(),
        hash_a_verificar,
    )

    if usuario is None or not password_valida or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"

    return TokenSalida(
        access_token=crear_token_acceso(usuario.id),
        expires_in=configuracion.ACCESS_TOKEN_MINUTES * 60,
    )


@router.get("/me", response_model=UsuarioSalida)
def consultar_mi_cuenta(
    usuario: Annotated[Usuario, Depends(obtener_usuario_actual)],
):
    return UsuarioSalida(
        id=usuario.id,
        correo=usuario.correo,
        rol=usuario.rol,
        activo=usuario.activo,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(
    usuario: Annotated[Usuario, Depends(obtener_usuario_actual)],
    datos_token: Annotated[dict, Depends(obtener_token_actual)],
    db: Annotated[Session, Depends(obtener_db)],
):
    registro = TokenRevocado(
        jti=datos_token["jti"],
        fecha_expiracion=datetime.fromtimestamp(
            datos_token["exp"],
            tz=timezone.utc,
        ).replace(tzinfo=None),
    )

    db.add(registro)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        # Otra solicitud pudo revocar el mismo token simultáneamente.
        if db.get(TokenRevocado, datos_token["jti"]) is None:
            raise

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"Cache-Control": "no-store"},
    )
