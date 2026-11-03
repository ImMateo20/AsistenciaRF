import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.base import Base
from app.database import obtener_db
from app.main import app
from app.models.grupo import Grupo
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.security import generar_hash
from app.tokens import crear_token_acceso


@pytest.fixture(scope="module")
def password_hash():
    return generar_hash("ClaveSoloParaPruebas-2026!")


@pytest.fixture
def entorno_grupos(password_hash):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    try:
        Base.metadata.create_all(
            engine,
            tables=[
                Usuario.__table__,
                TokenRevocado.__table__,
                Grupo.__table__,
            ],
        )

        with Session(engine) as db:
            admin = Usuario(
                correo="admin@example.com",
                password_hash=password_hash,
                rol="administrador",
                activo=True,
            )
            profesor = Usuario(
                correo="profesor@example.com",
                password_hash=password_hash,
                rol="profesor",
                activo=True,
            )
            primero = Grupo(nombre="3A", activo=True)
            segundo = Grupo(nombre="3B", activo=True)

            db.add_all([admin, profesor, primero, segundo])
            db.flush()

            admin_id, profesor_id = admin.id, profesor.id
            primero_id, segundo_id = primero.id, segundo.id
            db.commit()

        def reemplazar_db():
            with Session(engine) as db:
                yield db

        anteriores = app.dependency_overrides.copy()
        app.dependency_overrides[obtener_db] = reemplazar_db

        try:
            with TestClient(app) as cliente:
                yield {
                    "cliente": cliente,
                    "admin": {
                        "Authorization": f"Bearer {crear_token_acceso(admin_id)}",
                    },
                    "profesor": {
                        "Authorization": f"Bearer {crear_token_acceso(profesor_id)}",
                    },
                    "primero_id": primero_id,
                    "segundo_id": segundo_id,
                }
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(anteriores)
    finally:
        engine.dispose()


def test_crear_y_consultar_grupo(entorno_grupos):
    cliente = entorno_grupos["cliente"]
    headers = entorno_grupos["admin"]

    respuesta = cliente.post("/grupos", headers=headers, json={"nombre": " 4A "})

    assert respuesta.status_code == 201
    grupo = respuesta.json()
    assert grupo["nombre"] == "4A"
    assert grupo["activo"] is True

    consulta = cliente.get(f"/grupos/{grupo['id']}", headers=headers)
    assert consulta.status_code == 200
    assert consulta.json() == grupo


def test_listar_grupos_con_paginacion(entorno_grupos):
    cliente = entorno_grupos["cliente"]

    for desplazamiento, campo in enumerate(("primero_id", "segundo_id")):
        respuesta = cliente.get(
            "/grupos",
            headers=entorno_grupos["admin"],
            params={"limite": 1, "desplazamiento": desplazamiento},
        )

        assert respuesta.status_code == 200
        assert [grupo["id"] for grupo in respuesta.json()] == [entorno_grupos[campo]]


def test_editar_estado_conserva_nombre(entorno_grupos):
    cliente = entorno_grupos["cliente"]
    headers = entorno_grupos["admin"]
    ruta = f"/grupos/{entorno_grupos['primero_id']}"

    respuesta = cliente.patch(ruta, headers=headers, json={"activo": False})

    assert respuesta.status_code == 200
    assert respuesta.json()["activo"] is False
    assert respuesta.json()["nombre"] == "3A"

    consulta = cliente.get(ruta, headers=headers)
    assert consulta.status_code == 200
    assert consulta.json() == respuesta.json()


def test_crear_rechaza_nombre_duplicado(entorno_grupos):
    respuesta = entorno_grupos["cliente"].post(
        "/grupos",
        headers=entorno_grupos["admin"],
        json={"nombre": "3A"},
    )

    assert respuesta.status_code == 409


def test_editar_rechaza_duplicado_sin_modificar_grupo(entorno_grupos):
    cliente = entorno_grupos["cliente"]
    headers = entorno_grupos["admin"]
    ruta = f"/grupos/{entorno_grupos['segundo_id']}"

    respuesta = cliente.patch(
        ruta, headers=headers, json={"nombre": "3A", "activo": False}
    )
    assert respuesta.status_code == 409

    consulta = cliente.get(ruta, headers=headers)
    assert consulta.status_code == 200
    assert consulta.json()["nombre"] == "3B"
    assert consulta.json()["activo"] is True


@pytest.mark.parametrize("metodo", ["GET", "PATCH"])
def test_grupo_inexistente(entorno_grupos, metodo):
    opciones = {"json": {"nombre": "4A"}} if metodo == "PATCH" else {}

    respuesta = entorno_grupos["cliente"].request(
        metodo, "/grupos/99999", headers=entorno_grupos["admin"], **opciones
    )

    assert respuesta.status_code == 404


@pytest.mark.parametrize(
    "metodo,datos",
    [
        ("POST", {}),
        ("POST", {"nombre": "   "}),
        ("POST", {"nombre": "A" * 51}),
        ("PATCH", {}),
        ("PATCH", {"nombre": None}),
        ("PATCH", {"activo": None}),
    ],
)
def test_rechazar_datos_invalidos(entorno_grupos, metodo, datos):
    ruta = "/grupos"
    if metodo == "PATCH":
        ruta += f"/{entorno_grupos['primero_id']}"

    respuesta = entorno_grupos["cliente"].request(
        metodo, ruta, headers=entorno_grupos["admin"], json=datos
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize(
    "metodo,detalle",
    [("GET", False), ("GET", True), ("POST", False), ("PATCH", True)],
)
@pytest.mark.parametrize("rol,estado_esperado", [(None, 401), ("profesor", 403)])
def test_control_de_acceso(entorno_grupos, metodo, detalle, rol, estado_esperado):
    ruta = "/grupos"
    if detalle:
        ruta += f"/{entorno_grupos['primero_id']}"

    opciones = {"json": {"nombre": "4A"}} if metodo in ("POST", "PATCH") else {}

    respuesta = entorno_grupos["cliente"].request(
        metodo,
        ruta,
        headers=entorno_grupos[rol] if rol else {},
        **opciones,
    )

    assert respuesta.status_code == estado_esperado
