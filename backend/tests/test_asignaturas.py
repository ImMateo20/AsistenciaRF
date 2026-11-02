import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.base import Base
from app.database import obtener_db
from app.main import app
from app.models.asignatura import Asignatura
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.security import generar_hash
from app.tokens import crear_token_acceso


@pytest.fixture(scope="module")
def password_hash():
    return generar_hash("ClaveSoloParaPruebas-2026!")


@pytest.fixture
def entorno_asignaturas(password_hash):
    engine_pruebas = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(
        engine_pruebas,
        tables=[
            Usuario.__table__,
            TokenRevocado.__table__,
            Asignatura.__table__,
        ],
    )

    with Session(engine_pruebas) as db:
        administrador = Usuario(
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

        primera = Asignatura(
            clave="PLN01",
            nombre="Procesamiento de Lenguaje Natural",
            activo=True,
        )

        segunda = Asignatura(
            clave="PROG01",
            nombre="Programación",
            activo=True,
        )

        db.add_all([administrador, profesor, primera, segunda])
        db.flush()

        admin_id = administrador.id
        profesor_id = profesor.id
        primera_id = primera.id
        segunda_id = segunda.id

        db.commit()

    def reemplazar_db():
        with Session(engine_pruebas) as db:
            yield db

    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[obtener_db] = reemplazar_db

    try:
        with TestClient(app) as cliente:
            yield {
                "cliente": cliente,
                "admin": {
                    "Authorization": (f"Bearer {crear_token_acceso(admin_id)}"),
                },
                "profesor": {
                    "Authorization": (f"Bearer {crear_token_acceso(profesor_id)}"),
                },
                "primera_id": primera_id,
                "segunda_id": segunda_id,
            }
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)
        engine_pruebas.dispose()


def test_crear_y_consultar_asignatura(entorno_asignaturas):
    entorno = entorno_asignaturas
    cliente = entorno["cliente"]

    respuesta = cliente.post(
        "/asignaturas",
        headers=entorno["admin"],
        json={
            "clave": "  BD01  ",
            "nombre": "  Bases de Datos  ",
        },
    )

    assert respuesta.status_code == 201

    asignatura = respuesta.json()

    assert asignatura["clave"] == "BD01"
    assert asignatura["nombre"] == "Bases de Datos"
    assert asignatura["activo"] is True

    consulta = cliente.get(
        f"/asignaturas/{asignatura['id']}",
        headers=entorno["admin"],
    )

    assert consulta.status_code == 200
    assert consulta.json() == asignatura


def test_listar_con_paginacion(entorno_asignaturas):
    entorno = entorno_asignaturas
    cliente = entorno["cliente"]

    primera_pagina = cliente.get(
        "/asignaturas?limite=1&desplazamiento=0",
        headers=entorno["admin"],
    )

    segunda_pagina = cliente.get(
        "/asignaturas?limite=1&desplazamiento=1",
        headers=entorno["admin"],
    )

    assert primera_pagina.status_code == 200
    assert segunda_pagina.status_code == 200

    assert len(primera_pagina.json()) == 1
    assert len(segunda_pagina.json()) == 1

    assert primera_pagina.json()[0]["id"] == entorno["primera_id"]
    assert segunda_pagina.json()[0]["id"] == entorno["segunda_id"]


def test_crear_rechaza_clave_duplicada(entorno_asignaturas):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].post(
        "/asignaturas",
        headers=entorno["admin"],
        json={
            "clave": "PLN01",
            "nombre": "Otra asignatura",
        },
    )

    assert respuesta.status_code == 409

    listado = entorno["cliente"].get(
        "/asignaturas",
        headers=entorno["admin"],
    )

    assert listado.status_code == 200
    assert len(listado.json()) == 2


def test_editar_asignatura(entorno_asignaturas):
    entorno = entorno_asignaturas
    cliente = entorno["cliente"]
    ruta = f"/asignaturas/{entorno['primera_id']}"

    respuesta = cliente.patch(
        ruta,
        headers=entorno["admin"],
        json={
            "clave": "PLN02",
            "nombre": "Lenguaje Natural",
            "activo": False,
        },
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["clave"] == "PLN02"
    assert respuesta.json()["nombre"] == "Lenguaje Natural"
    assert respuesta.json()["activo"] is False

    consulta = cliente.get(ruta, headers=entorno["admin"])

    assert consulta.status_code == 200
    assert consulta.json() == respuesta.json()


def test_edicion_parcial_conserva_otros_campos(entorno_asignaturas):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].patch(
        f"/asignaturas/{entorno['primera_id']}",
        headers=entorno["admin"],
        json={"nombre": "Nombre actualizado"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Nombre actualizado"
    assert respuesta.json()["clave"] == "PLN01"
    assert respuesta.json()["activo"] is True


def test_editar_rechaza_duplicado_sin_modificar_registro(
    entorno_asignaturas,
):
    entorno = entorno_asignaturas
    cliente = entorno["cliente"]
    ruta = f"/asignaturas/{entorno['segunda_id']}"

    respuesta = cliente.patch(
        ruta,
        headers=entorno["admin"],
        json={
            "clave": "PLN01",
            "nombre": "Este cambio tampoco debe guardarse",
        },
    )

    assert respuesta.status_code == 409

    consulta = cliente.get(ruta, headers=entorno["admin"])

    assert consulta.status_code == 200
    assert consulta.json()["clave"] == "PROG01"
    assert consulta.json()["nombre"] == "Programación"


@pytest.mark.parametrize("metodo", ["GET", "PATCH"])
def test_asignatura_inexistente(entorno_asignaturas, metodo):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].request(
        metodo,
        "/asignaturas/99999",
        headers=entorno["admin"],
        **({"json": {"nombre": "Cambio"}} if metodo == "PATCH" else {}),
    )

    assert respuesta.status_code == 404


@pytest.mark.parametrize(
    "metodo,ruta,datos",
    [
        ("GET", "/asignaturas", None),
        ("GET", "/asignaturas/1", None),
        (
            "POST",
            "/asignaturas",
            {"clave": "BD01", "nombre": "Bases de Datos"},
        ),
        ("PATCH", "/asignaturas/1", {"nombre": "Cambio"}),
    ],
)
@pytest.mark.parametrize(
    "rol,estado_esperado",
    [
        ("profesor", 403),
        (None, 401),
    ],
)
def test_control_de_acceso(
    entorno_asignaturas,
    metodo,
    ruta,
    datos,
    rol,
    estado_esperado,
):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].request(
        metodo,
        ruta,
        headers=entorno[rol] if rol else {},
        **({"json": datos} if datos is not None else {}),
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.parametrize(
    "datos",
    [
        {},
        {"clave": "BD01"},
        {"clave": "", "nombre": "Bases de Datos"},
        {"clave": "   ", "nombre": "Bases de Datos"},
        {"clave": "A" * 31, "nombre": "Bases de Datos"},
        {"clave": "BD01", "nombre": "   "},
        {"clave": "BD01", "nombre": "A" * 151},
        {"clave": "BD01", "nombre": None},
        {"clave": "BD01", "nombre": "Bases de Datos", "extra": True},
    ],
)
def test_rechazar_creacion_invalida(entorno_asignaturas, datos):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].post(
        "/asignaturas",
        headers=entorno["admin"],
        json=datos,
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize(
    "datos",
    [
        {},
        {"nombre": None},
        {"clave": None},
        {"activo": None},
        {"nombre": "   "},
        {"clave": "A" * 31},
        {"nombre": "A" * 151},
        {"campo_desconocido": "valor"},
    ],
)
def test_rechazar_edicion_invalida(entorno_asignaturas, datos):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].patch(
        f"/asignaturas/{entorno['primera_id']}",
        headers=entorno["admin"],
        json=datos,
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize(
    "parametros",
    [
        "limite=0",
        "limite=101",
        "desplazamiento=-1",
    ],
)
def test_rechazar_paginacion_invalida(
    entorno_asignaturas,
    parametros,
):
    entorno = entorno_asignaturas

    respuesta = entorno["cliente"].get(
        f"/asignaturas?{parametros}",
        headers=entorno["admin"],
    )

    assert respuesta.status_code == 422
