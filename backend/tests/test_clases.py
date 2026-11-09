from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import obtener_usuario_actual, requerir_administrador
from app.main import app
from app.models.clase import Clase

DATOS_CLASE = {
    "asignatura_id": 1,
    "grupo_id": 2,
    "profesor_id": 3,
    "periodo_id": 4,
}


@pytest.fixture
def entorno():
    db = Mock(spec=Session)
    clase = Clase(id=10, **DATOS_CLASE, activo=True)

    def buscar_registro(modelo, identificador):
        if modelo is Clase:
            return clase if identificador == clase.id else None

        return object() if identificador in DATOS_CLASE.values() else None

    def simular_insercion(nueva_clase):
        # Simula el ID y el estado que tendría la clase después de insertarla.
        nueva_clase.id = 11
        nueva_clase.activo = True

    db.get.side_effect = buscar_registro
    db.add.side_effect = simular_insercion
    db.scalar.return_value = None
    db.scalars.return_value = [clase]

    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[obtener_db] = lambda: db
    app.dependency_overrides[requerir_administrador] = lambda: None

    try:
        with TestClient(app) as cliente:
            yield cliente, db
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)


def test_listar_clases(entorno):
    cliente, _ = entorno

    respuesta = cliente.get("/clases?limite=1&desplazamiento=0")

    assert respuesta.status_code == 200
    assert respuesta.json() == [{"id": 10, **DATOS_CLASE, "activo": True}]


def test_consultar_clase_inexistente(entorno):
    cliente, _ = entorno

    respuesta = cliente.get("/clases/999")

    assert respuesta.status_code == 404


def test_crear_clase(entorno):
    cliente, db = entorno

    respuesta = cliente.post("/clases", json=DATOS_CLASE)

    assert respuesta.status_code == 201
    assert respuesta.json() == {"id": 11, **DATOS_CLASE, "activo": True}
    db.commit.assert_called_once()


def test_rechazar_clase_duplicada(entorno):
    cliente, db = entorno
    db.scalar.return_value = 10

    respuesta = cliente.post("/clases", json=DATOS_CLASE)

    assert respuesta.status_code == 409
    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_rechazar_periodo_inexistente(entorno):
    cliente, db = entorno

    respuesta = cliente.post(
        "/clases",
        json={**DATOS_CLASE, "periodo_id": 999},
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["detail"] == "El periodo escolar no existe."
    db.commit.assert_not_called()


def test_editar_solo_el_estado(entorno):
    cliente, db = entorno

    respuesta = cliente.patch("/clases/10", json={"activo": False})

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": 10, **DATOS_CLASE, "activo": False}
    db.commit.assert_called_once()


@pytest.mark.parametrize("cambios", [{}, {"activo": None}, {"grupo_id": 0}])
def test_rechazar_edicion_invalida(entorno, cambios):
    cliente, db = entorno

    respuesta = cliente.patch("/clases/10", json=cambios)

    assert respuesta.status_code == 422
    db.commit.assert_not_called()


def test_listado_requiere_autenticacion():
    # Aquí no usamos el entorno simulado: queremos probar la protección real.
    with TestClient(app) as cliente:
        respuesta = cliente.get("/clases")

    assert respuesta.status_code == 401

def test_profesor_no_puede_listar_clases():
    profesor = Mock(rol="profesor", activo=True)
    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[obtener_usuario_actual] = lambda: profesor

    try:
        with TestClient(app) as cliente:
            respuesta = cliente.get("/clases")

        assert respuesta.status_code == 403
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)