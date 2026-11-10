from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import obtener_db
from app.dependencies.auth import obtener_usuario_actual, requerir_administrador
from app.main import app
from app.models.clase import Clase

DATOS_CREAR_CLASE = {
    "asignatura_id": 1,
    "grupo_id": 2,
    "profesor_id": 3,
}

DATOS_POST_CLASE = {
    **DATOS_CREAR_CLASE,
    "bloques": [
        {
            "dia_semana": 1,
            "hora_inicio": "07:00:00",
            "hora_fin": "09:00:00",
        }
    ],
}

PERIODO_ID = 4

DATOS_CLASE = {
    **DATOS_CREAR_CLASE,
    "periodo_id": PERIODO_ID,
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
        nueva_clase.id = 11
        nueva_clase.activo = True

    db.get.side_effect = buscar_registro
    db.add.side_effect = simular_insercion

    def consultar_escalar(consulta):
        entidad = consulta.column_descriptions[0].get("entity")

        if entidad is Clase:
            return None

        return 1

    db.scalar.side_effect = consultar_escalar
    db.scalars.return_value = [clase]

    db.execute.return_value.scalar_one_or_none.return_value = PERIODO_ID

    db.execute.return_value.first.return_value = None

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
    assert respuesta.json() == [{"id": 10, **DATOS_CREAR_CLASE, "activo": True}]


def test_consultar_clase_inexistente(entorno):
    cliente, _ = entorno

    respuesta = cliente.get("/clases/999")

    assert respuesta.status_code == 404


def test_crear_clase_con_periodo_predeterminado_existente(entorno):
    cliente, db = entorno

    respuesta = cliente.post("/clases", json=DATOS_POST_CLASE)

    assert respuesta.status_code == 201, respuesta.json()
    assert respuesta.json() == {"id": 11, **DATOS_CREAR_CLASE, "activo": True}
    assert db.add.call_args.args[0].periodo_id == PERIODO_ID
    db.add_all.assert_called_once()

    horarios = db.add_all.call_args.args[0]
    assert len(horarios) == 1
    assert horarios[0].clase_id == 11
    assert horarios[0].dia_semana == 1
    assert horarios[0].hora_inicio.isoformat() == "07:00:00"
    assert horarios[0].hora_fin.isoformat() == "09:00:00"
    db.commit.assert_called_once()


def test_crear_clase_cuando_falta_el_periodo_predeterminado(entorno):
    cliente, db = entorno
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.execute.return_value.scalar_one.return_value = PERIODO_ID

    respuesta = cliente.post("/clases", json=DATOS_POST_CLASE)

    assert respuesta.status_code == 201, respuesta.json()
    assert respuesta.json() == {"id": 11, **DATOS_CREAR_CLASE, "activo": True}
    assert db.add.call_args.args[0].periodo_id == PERIODO_ID
    db.add_all.assert_called_once()

    horarios = db.add_all.call_args.args[0]
    assert len(horarios) == 1
    assert horarios[0].clase_id == 11
    assert horarios[0].dia_semana == 1
    assert horarios[0].hora_inicio.isoformat() == "07:00:00"
    assert horarios[0].hora_fin.isoformat() == "09:00:00"
    db.commit.assert_called_once()


def test_rechazar_clase_duplicada(entorno):
    cliente, db = entorno

    db.scalar.side_effect = [2, 3, 10]

    respuesta = cliente.post("/clases", json=DATOS_POST_CLASE)

    assert respuesta.status_code == 409, respuesta.json()
    assert respuesta.json()["detail"] == (
        "Ya existe una clase para esta asignatura, grupo y periodo."
    )
    db.add.assert_not_called()
    db.add_all.assert_not_called()
    db.commit.assert_not_called()


def test_rechazar_asignatura_inexistente(entorno):
    cliente, db = entorno

    respuesta = cliente.post(
        "/clases",
        json={**DATOS_POST_CLASE, "asignatura_id": 999},
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["detail"] == "La asignatura no existe."
    db.commit.assert_not_called()


def test_rechazar_periodo_en_el_registro(entorno):
    cliente, db = entorno

    respuesta = cliente.post(
        "/clases",
        json={**DATOS_POST_CLASE, "periodo_id": PERIODO_ID},
    )

    assert respuesta.status_code == 422
    assert any(
        error["loc"] == ["body", "periodo_id"] for error in respuesta.json()["detail"]
    )
    db.commit.assert_not_called()


def test_editar_solo_el_estado_conserva_el_periodo(entorno):
    cliente, db = entorno
    clase = db.get(Clase, 10)
    periodo_original = clase.periodo_id

    respuesta = cliente.patch("/clases/10", json={"activo": False})

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": 10, **DATOS_CREAR_CLASE, "activo": False}
    assert clase.periodo_id == periodo_original
    db.commit.assert_called_once()


@pytest.mark.parametrize(
    "cambios",
    [{}, {"activo": None}, {"grupo_id": 0}, {"periodo_id": 5}],
)
def test_rechazar_edicion_invalida(entorno, cambios):
    cliente, db = entorno

    respuesta = cliente.patch("/clases/10", json=cambios)

    assert respuesta.status_code == 422
    db.commit.assert_not_called()


def test_listado_requiere_autenticacion():
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
