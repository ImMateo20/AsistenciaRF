from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import configuracion
from app.database import obtener_db
from app.main import app
from app.security import generar_hash
from app.tokens import ALGORITMO, crear_token_acceso

from app.models.usuario import Usuario
from app.models.token_revocado import TokenRevocado

PASSWORD_PRUEBA = "ClaveDePrueba-2026!"


@pytest.fixture
def usuario():
    return SimpleNamespace(
        id=1,
        correo="admin@example.com",
        password_hash=generar_hash(PASSWORD_PRUEBA),
        rol="administrador",
        activo=True,
    )


@pytest.fixture
def entorno(usuario):
    db = Mock(spec=Session)
    db.scalar.return_value = usuario

    def buscar_registro(modelo, identificador):
        if modelo is Usuario:
            return usuario

        return None

    db.get.side_effect = buscar_registro

    def reemplazar_db():
        yield db

    overrides_anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[obtener_db] = reemplazar_db

    try:
        with TestClient(app) as cliente:
            yield cliente, db
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(overrides_anteriores)


def test_login_correcto(entorno):
    cliente, _ = entorno

    respuesta = cliente.post(
        "/auth/login",
        json={
            "correo": "admin@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert datos["access_token"]
    assert datos["token_type"] == "bearer"
    assert datos["expires_in"] > 0
    assert "password_hash" not in datos
    assert respuesta.headers["cache-control"] == "no-store"

    perfil = cliente.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {datos['access_token']}"},
    )

    assert perfil.status_code == 200
    assert perfil.json()["correo"] == "admin@example.com"
    assert "password_hash" not in perfil.json()


def test_login_password_incorrecta(entorno):
    cliente, _ = entorno

    respuesta = cliente.post(
        "/auth/login",
        json={
            "correo": "admin@example.com",
            "password": "PasswordIncorrecta!",
        },
    )

    assert respuesta.status_code == 401
    assert "access_token" not in respuesta.json()


def test_login_correo_no_registrado(entorno):
    cliente, db = entorno
    db.scalar.return_value = None

    respuesta = cliente.post(
        "/auth/login",
        json={
            "correo": "desconocido@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert respuesta.status_code == 401


def test_login_usuario_inactivo(entorno, usuario):
    cliente, _ = entorno
    usuario.activo = False

    respuesta = cliente.post(
        "/auth/login",
        json={
            "correo": "admin@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert respuesta.status_code == 401


def test_perfil_sin_token(entorno):
    cliente, _ = entorno

    respuesta = cliente.get("/auth/me")

    assert respuesta.status_code == 401


def test_perfil_token_invalido(entorno):
    cliente, _ = entorno

    respuesta = cliente.get(
        "/auth/me",
        headers={"Authorization": "Bearer token-invalido"},
    )

    assert respuesta.status_code == 401


def test_perfil_token_vencido(entorno):
    cliente, _ = entorno
    ahora = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "sub": "1",
            "iat": ahora - timedelta(minutes=10),
            "exp": ahora - timedelta(minutes=5),
            "tipo": "acceso",
        },
        configuracion.JWT_SECRET_KEY.get_secret_value(),
        algorithm=ALGORITMO,
    )

    respuesta = cliente.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert respuesta.status_code == 401


def test_perfil_usuario_desactivado(entorno, usuario):
    cliente, _ = entorno
    token = crear_token_acceso(usuario.id)

    usuario.activo = False

    respuesta = cliente.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert respuesta.status_code == 401


def test_perfil_token_revocado(entorno, usuario):
    cliente, db = entorno

    def buscar_registro(modelo, identificador):
        if modelo is Usuario:
            return usuario

        return SimpleNamespace(jti=identificador)

    db.get.side_effect = buscar_registro

    token = crear_token_acceso(usuario.id)

    respuesta = cliente.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert respuesta.status_code == 401


def test_logout_invalida_token(entorno, usuario):
    cliente, db = entorno
    revocados = {}

    def buscar_registro(modelo, identificador):
        if modelo is Usuario:
            return usuario

        if modelo is TokenRevocado:
            return revocados.get(identificador)

        return None

    def guardar_registro(registro):
        if isinstance(registro, TokenRevocado):
            revocados[registro.jti] = registro

    db.get.side_effect = buscar_registro
    db.add.side_effect = guardar_registro

    login = cliente.post(
        "/auth/login",
        json={
            "correo": "admin@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    antes = cliente.get("/auth/me", headers=headers)
    assert antes.status_code == 200

    salida = cliente.post("/auth/logout", headers=headers)
    assert salida.status_code == 204
    assert salida.content == b""
    db.commit.assert_called_once()

    despues = cliente.get("/auth/me", headers=headers)
    assert despues.status_code == 401
