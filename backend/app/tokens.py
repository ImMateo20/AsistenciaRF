from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt

from app.config import configuracion

ALGORITMO = "HS256"


def crear_token_acceso(usuario_id: int) -> str:
    ahora = datetime.now(timezone.utc)

    datos = {
        "sub": str(usuario_id),
        "jti": str(uuid4()),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=configuracion.ACCESS_TOKEN_MINUTES),
        "tipo": "acceso",
    }

    return jwt.encode(
        datos,
        configuracion.JWT_SECRET_KEY.get_secret_value(),
        algorithm=ALGORITMO,
    )


def leer_token_acceso(token: str) -> dict:
    datos = jwt.decode(
        token,
        configuracion.JWT_SECRET_KEY.get_secret_value(),
        algorithms=[ALGORITMO],
        options={"require": ["sub", "iat", "exp", "jti"]},
    )

    if datos.get("tipo") != "acceso":
        raise jwt.InvalidTokenError("Tipo de token inválido")

    identificador = datos["sub"]

    if (
        not isinstance(identificador, str)
        or not identificador.isascii()
        or not identificador.isdigit()
        or int(identificador) <= 0
    ):
        raise jwt.InvalidTokenError("Identificador inválido")

    try:
        jti = datos["jti"]

        if not isinstance(jti, str) or str(UUID(jti)) != jti:
            raise ValueError
    except (ValueError, AttributeError):
        raise jwt.InvalidTokenError("Identificador de token inválido")

    return datos


def obtener_usuario_id(token: str) -> int:
    return int(leer_token_acceso(token)["sub"])
