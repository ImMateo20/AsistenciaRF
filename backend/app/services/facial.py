from functools import lru_cache
from io import BytesIO
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

DIRECTORIO_BACKEND = Path(__file__).resolve().parents[2]
DIRECTORIO_MODELOS = DIRECTORIO_BACKEND / "modelos_faciales"

UMBRAL_COINCIDENCIA_REGISTRO = 0.363
MAX_BYTES_IMAGEN = 5 * 1024 * 1024
MAX_LADO_IMAGEN = 4096
MAX_PIXELES_IMAGEN = 8_000_000

VERSION_MODELO = "sface-2021dec-yunet-2023mar-normalizado-v1"


class ErrorImagenFacial(ValueError):
    pass


def preparar_imagen(contenido: bytes) -> np.ndarray:
    if not contenido:
        raise ErrorImagenFacial("La imagen está vacía.")

    if len(contenido) > MAX_BYTES_IMAGEN:
        raise ErrorImagenFacial("La imagen supera el límite de 5 MiB.")

    try:
        with Image.open(
            BytesIO(contenido),
            formats=["JPEG", "PNG"],
        ) as imagen:
            ancho, alto = imagen.size

            if (
                ancho <= 0
                or alto <= 0
                or max(ancho, alto) > MAX_LADO_IMAGEN
                or ancho * alto > MAX_PIXELES_IMAGEN
            ):
                raise ErrorImagenFacial("La imagen tiene dimensiones no permitidas.")

            if getattr(imagen, "n_frames", 1) != 1:
                raise ErrorImagenFacial("Utiliza una imagen fija, no una animación.")

            imagen.load()

            corregida = ImageOps.exif_transpose(imagen)
            rgb = np.array(corregida.convert("RGB"))

    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
    ) as error:
        if isinstance(error, ErrorImagenFacial):
            raise

        raise ErrorImagenFacial(
            "No se pudo leer la imagen. Utiliza un JPEG o PNG válido."
        ) from error

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    alto, ancho = bgr.shape[:2]

    if max(ancho, alto) > 1280:
        escala = 1280 / max(ancho, alto)

        bgr = cv2.resize(
            bgr,
            (
                max(1, round(ancho * escala)),
                max(1, round(alto * escala)),
            ),
            interpolation=cv2.INTER_AREA,
        )

    return bgr


class MotorFacial:
    def __init__(self):
        deteccion = DIRECTORIO_MODELOS / "face_detection_yunet_2023mar.onnx"

        reconocimiento = DIRECTORIO_MODELOS / "face_recognition_sface_2021dec.onnx"

        for archivo in [deteccion, reconocimiento]:
            if not archivo.is_file():
                raise RuntimeError(f"Falta el modelo facial: {archivo.name}")

        self.detector = cv2.FaceDetectorYN.create(
            str(deteccion),
            "",
            (320, 320),
            score_threshold=0.9,
            nms_threshold=0.3,
            top_k=5000,
        )

        self.reconocedor = cv2.FaceRecognizerSF.create(
            str(reconocimiento),
            "",
        )

        self.lock = Lock()

    def obtener_representacion(self, contenido: bytes) -> list[float]:
        imagen = preparar_imagen(contenido)
        alto, ancho = imagen.shape[:2]

        with self.lock:
            self.detector.setInputSize((ancho, alto))
            _, rostros = self.detector.detect(imagen)

            if rostros is None or len(rostros) == 0:
                raise ErrorImagenFacial(
                    "No se detectó un rostro. Revisa la iluminación."
                )

            if len(rostros) != 1:
                raise ErrorImagenFacial("Debe aparecer únicamente una persona.")

            rostro = rostros[0]

            if rostro[2] < 80 or rostro[3] < 80:
                raise ErrorImagenFacial("El rostro se ve demasiado pequeño. Acércate.")

            alineado = self.reconocedor.alignCrop(imagen, rostro)

            vector = self.reconocedor.feature(alineado).flatten().copy()

        if vector.size != 128 or not np.isfinite(vector).all():
            raise ErrorImagenFacial(
                "No se pudo obtener una representación facial válida."
            )

        norma = float(np.linalg.norm(vector))

        if norma <= 0:
            raise ErrorImagenFacial("La representación facial no es válida.")

        return (vector / norma).tolist()


@lru_cache(maxsize=1)
def obtener_motor_facial() -> MotorFacial:
    return MotorFacial()


def validar_coherencia_capturas(
    representaciones: list[list[float]],
) -> None:
    if len(representaciones) != 3:
        raise ErrorImagenFacial("Se necesitan tres capturas del rostro.")

    vectores = []

    for representacion in representaciones:
        vector = np.asarray(representacion, dtype=np.float32)

        if vector.shape != (128,) or not np.isfinite(vector).all():
            raise ErrorImagenFacial("Una captura produjo una representación inválida.")

        norma = float(np.linalg.norm(vector))

        if norma <= 0:
            raise ErrorImagenFacial("No se pudo procesar una de las capturas.")

        vectores.append(vector / norma)

    for primero, segundo in ((0, 1), (0, 2), (1, 2)):
        similitud = float(np.dot(vectores[primero], vectores[segundo]))

        if similitud < UMBRAL_COINCIDENCIA_REGISTRO:
            raise ErrorImagenFacial(
                "Las capturas no tienen suficiente coincidencia. "
                "Vuelve a tomarlas con buena iluminación y "
                "sin girar demasiado el rostro."
            )
