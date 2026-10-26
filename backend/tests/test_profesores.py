import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.base import Base
from app.database import obtener_db
from app.main import app
from app.models.profesor import Profesor
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.security import generar_hash
from app.tokens import crear_token_acceso

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.profesor import ProfesorCrear
from app.services.profesores import registrar_profesor

PASSWORD_PRUEBA = "ClaveDePrueba-2026!"


@pytest.fixture(scope="module")
def password_hash():
    return generar_hash(PASSWORD_PRUEBA)


@pytest.fixture
def entorno_profesores(password_hash):
    engine_pruebas = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine_pruebas, "connect")
    def activar_claves_foraneas(conexion, registro):
        cursor = conexion.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(
        engine_pruebas,
        tables=[
            Usuario.__table__,
            Profesor.__table__,
            TokenRevocado.__table__,
        ],
    )

    with Session(engine_pruebas) as db:
        administrador = Usuario(
            correo="admin@example.com",
            password_hash=password_hash,
            rol="administrador",
            activo=True,
        )

        usuario_profesor = Usuario(
            correo="profesor@example.com",
            password_hash=password_hash,
            rol="profesor",
            activo=True,
        )

        db.add_all([administrador, usuario_profesor])
        db.flush()

        profesor = Profesor(
            nombre="Profesor existente",
            matricula="1020301",
            usuario_id=usuario_profesor.id,
            activo=True,
        )

        db.add(profesor)
        db.flush()

        profesor_id = profesor.id
        admin_id = administrador.id
        usuario_profesor_id = usuario_profesor.id

        db.commit()

    def reemplazar_db():
        with Session(engine_pruebas) as db:
            yield db

    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[obtener_db] = reemplazar_db

    headers_admin = {"Authorization": f"Bearer {crear_token_acceso(admin_id)}"}

    headers_profesor = {
        "Authorization": (f"Bearer {crear_token_acceso(usuario_profesor_id)}")
    }

    try:
        with TestClient(app) as cliente:
            yield {
                "cliente": cliente,
                "admin": headers_admin,
                "profesor": headers_profesor,
                "profesor_id": profesor_id,
                "engine": engine_pruebas,
            }
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)
        engine_pruebas.dispose()


def datos_profesor():
    return {
        "nombre": "Nuevo profesor",
        "matricula": "1020349",
        "correo": "nuevo@example.com",
        "password": PASSWORD_PRUEBA,
    }


def test_registrar_y_consultar_profesor(entorno_profesores):
    entorno = entorno_profesores
    cliente = entorno["cliente"]

    respuesta = cliente.post(
        "/profesores",
        headers=entorno["admin"],
        json=datos_profesor(),
    )

    assert respuesta.status_code == 201

    profesor = respuesta.json()

    assert profesor["matricula"] == "1020349"
    assert profesor["correo"] == "nuevo@example.com"
    assert "password" not in profesor
    assert "password_hash" not in profesor

    listado = cliente.get(
        "/profesores",
        headers=entorno["admin"],
    )

    assert listado.status_code == 200
    assert any(registro["id"] == profesor["id"] for registro in listado.json())

    # La cuenta creada también debe poder iniciar sesión.
    login = cliente.post(
        "/auth/login",
        json={
            "correo": "nuevo@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert login.status_code == 200


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("correo", "profesor@example.com"),
        ("matricula", "1020301"),
    ],
)
def test_rechazar_duplicados(entorno_profesores, campo, valor):
    entorno = entorno_profesores
    datos = datos_profesor()
    datos[campo] = valor

    respuesta = entorno["cliente"].post(
        "/profesores",
        headers=entorno["admin"],
        json=datos,
    )

    assert respuesta.status_code == 409


@pytest.mark.parametrize(
    "metodo,ruta,datos",
    [
        ("GET", "/profesores", None),
        ("POST", "/profesores", datos_profesor()),
        ("PATCH", "/profesores/1", {"nombre": "Cambio"}),
    ],
)
def test_profesor_sin_permiso(
    entorno_profesores,
    metodo,
    ruta,
    datos,
):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].request(
        metodo,
        ruta,
        headers=entorno["profesor"],
        json=datos,
    )

    assert respuesta.status_code == 403


def test_consultar_sin_token(entorno_profesores):
    respuesta = entorno_profesores["cliente"].get("/profesores")

    assert respuesta.status_code == 401


def test_rechazar_matricula_no_numerica(entorno_profesores):
    entorno = entorno_profesores
    datos = datos_profesor()
    datos["matricula"] = "ABC123"

    respuesta = entorno["cliente"].post(
        "/profesores",
        headers=entorno["admin"],
        json=datos,
    )

    assert respuesta.status_code == 422


def test_editar_profesor(entorno_profesores):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].patch(
        f"/profesores/{entorno['profesor_id']}",
        headers=entorno["admin"],
        json={"nombre": "Nombre actualizado"},
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert datos["nombre"] == "Nombre actualizado"
    assert datos["matricula"] == "1020301"
    assert datos["correo"] == "profesor@example.com"


def test_desactivar_impide_acceso(entorno_profesores):
    entorno = entorno_profesores
    cliente = entorno["cliente"]

    respuesta = cliente.patch(
        f"/profesores/{entorno['profesor_id']}",
        headers=entorno["admin"],
        json={"activo": False},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["activo"] is False

    login = cliente.post(
        "/auth/login",
        json={
            "correo": "profesor@example.com",
            "password": PASSWORD_PRUEBA,
        },
    )

    assert login.status_code == 401

    perfil = cliente.get(
        "/auth/me",
        headers=entorno["profesor"],
    )

    assert perfil.status_code == 401


def test_editar_profesor_inexistente(entorno_profesores):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].patch(
        "/profesores/99999",
        headers=entorno["admin"],
        json={"nombre": "Nombre actualizado"},
    )

    assert respuesta.status_code == 404


@pytest.mark.parametrize(
    "datos",
    [
        {},
        {"nombre": None},
        {"rol": "administrador"},
    ],
)
def test_rechazar_edicion_invalida(entorno_profesores, datos):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].patch(
        f"/profesores/{entorno['profesor_id']}",
        headers=entorno["admin"],
        json=datos,
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("correo", "profesor@example.com"),
        ("matricula", "1020301"),
    ],
)
def test_editar_rechaza_duplicados(
    entorno_profesores,
    campo,
    valor,
):
    entorno = entorno_profesores
    cliente = entorno["cliente"]

    creado = cliente.post(
        "/profesores",
        headers=entorno["admin"],
        json=datos_profesor(),
    )

    assert creado.status_code == 201
    profesor_id = creado.json()["id"]

    respuesta = cliente.patch(
        f"/profesores/{profesor_id}",
        headers=entorno["admin"],
        json={campo: valor},
    )

    assert respuesta.status_code == 409

    # El intento fallido no debe modificar el registro.
    listado = cliente.get(
        "/profesores",
        headers=entorno["admin"],
    )

    assert listado.status_code == 200

    profesor = next(
        registro for registro in listado.json() if registro["id"] == profesor_id
    )

    assert profesor["correo"] == "nuevo@example.com"
    assert profesor["matricula"] == "1020349"


def test_registro_fallido_no_deja_cuenta_huerfana(
    entorno_profesores,
    monkeypatch,
):
    engine = entorno_profesores["engine"]

    with Session(engine) as db:
        flush_original = db.flush

        def fallar_al_guardar_profesor(*args, **kwargs):
            if any(isinstance(objeto, Profesor) for objeto in db.new):
                raise SQLAlchemyError("Fallo simulado de prueba")

            return flush_original(*args, **kwargs)

        monkeypatch.setattr(db, "flush", fallar_al_guardar_profesor)

        with pytest.raises(SQLAlchemyError):
            registrar_profesor(
                db,
                ProfesorCrear(**datos_profesor()),
            )

    with Session(engine) as verificacion:
        cuenta = verificacion.scalar(
            select(Usuario.id).where(Usuario.correo == "nuevo@example.com")
        )

        profesor = verificacion.scalar(
            select(Profesor.id).where(Profesor.matricula == "1020349")
        )

        assert cuenta is None
        assert profesor is None


def test_consultar_profesor_por_id(entorno_profesores):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].get(
        f"/profesores/{entorno['profesor_id']}",
        headers=entorno["admin"],
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert datos["id"] == entorno["profesor_id"]
    assert datos["matricula"] == "1020301"
    assert "password" not in datos
    assert "password_hash" not in datos


def test_consultar_profesor_inexistente(entorno_profesores):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].get(
        "/profesores/99999",
        headers=entorno["admin"],
    )

    assert respuesta.status_code == 404


def test_profesor_no_puede_consultar_otro_perfil(
    entorno_profesores,
):
    entorno = entorno_profesores

    respuesta = entorno["cliente"].get(
        f"/profesores/{entorno['profesor_id']}",
        headers=entorno["profesor"],
    )

    assert respuesta.status_code == 403
