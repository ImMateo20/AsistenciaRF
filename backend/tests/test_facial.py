import numpy as np
import pytest

from app.services.facial import (
    ErrorImagenFacial,
    validar_coherencia_capturas,
)


def crear_vector(componentes):
    vector = np.zeros(128, dtype=np.float32)
    vector[: len(componentes)] = componentes

    return vector.tolist()


def test_acepta_capturas_similares():
    capturas = [
        crear_vector([1, 0]),
        crear_vector([0.98, 0.20]),
        crear_vector([0.98, -0.20]),
    ]

    validar_coherencia_capturas(capturas)


def test_rechaza_una_captura_diferente():
    capturas = [
        crear_vector([1, 0]),
        crear_vector([1, 0]),
        crear_vector([0, 1]),
    ]

    with pytest.raises(
        ErrorImagenFacial,
        match="suficiente coincidencia",
    ):
        validar_coherencia_capturas(capturas)


def test_compara_tambien_segunda_y_tercera_captura():
    # Ambas coinciden con la primera, pero no entre sí.
    capturas = [
        crear_vector([1, 0]),
        crear_vector([0.8, 0.6]),
        crear_vector([0.8, -0.6]),
    ]

    with pytest.raises(
        ErrorImagenFacial,
        match="suficiente coincidencia",
    ):
        validar_coherencia_capturas(capturas)


@pytest.mark.parametrize("cantidad", [0, 1, 2, 4])
def test_rechaza_cantidad_incorrecta(cantidad):
    capturas = [crear_vector([1, 0]) for _ in range(cantidad)]

    with pytest.raises(
        ErrorImagenFacial,
        match="tres capturas",
    ):
        validar_coherencia_capturas(capturas)


@pytest.mark.parametrize(
    "vector_invalido",
    [
        [1.0] * 127,
        [0.0] * 128,
        [float("nan")] * 128,
        [float("inf")] * 128,
    ],
)
def test_rechaza_representacion_invalida(vector_invalido):
    capturas = [
        crear_vector([1, 0]),
        crear_vector([1, 0]),
        vector_invalido,
    ]

    with pytest.raises(ErrorImagenFacial):
        validar_coherencia_capturas(capturas)
