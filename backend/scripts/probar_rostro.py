import argparse
from pathlib import Path

from app.services.facial import (
    ErrorImagenFacial,
    MAX_BYTES_IMAGEN,
    VERSION_MODELO,
    obtener_motor_facial,
)


def main():
    parser = argparse.ArgumentParser(description="Comprobar una imagen facial local.")

    parser.add_argument("imagen", type=Path)
    argumentos = parser.parse_args()

    try:
        with argumentos.imagen.open("rb") as archivo:
            contenido = archivo.read(MAX_BYTES_IMAGEN + 1)

        motor = obtener_motor_facial()
        vector = motor.obtener_representacion(contenido)

    except (OSError, ErrorImagenFacial) as error:
        raise SystemExit(f"No se pudo procesar la imagen: {error}")

    print("Rostro procesado correctamente.")
    print(f"Dimensión del vector: {len(vector)}")
    print(f"Modelo: {VERSION_MODELO}")


if __name__ == "__main__":
    main()
