from pathlib import Path

import cv2

DIRECTORIO_BACKEND = Path(__file__).resolve().parent.parent
DIRECTORIO_MODELOS = DIRECTORIO_BACKEND / "modelos_faciales"

MODELO_DETECCION = DIRECTORIO_MODELOS / "face_detection_yunet_2023mar.onnx"

MODELO_RECONOCIMIENTO = DIRECTORIO_MODELOS / "face_recognition_sface_2021dec.onnx"


def comprobar_modelos():
    for archivo in [MODELO_DETECCION, MODELO_RECONOCIMIENTO]:
        if not archivo.is_file():
            raise FileNotFoundError(f"No se encontró el modelo: {archivo.name}")

        if archivo.stat().st_size < 100_000:
            raise ValueError(f"El archivo parece incompleto: {archivo.name}")

    detector = cv2.FaceDetectorYN.create(
        str(MODELO_DETECCION),
        "",
        (320, 320),
        score_threshold=0.9,
        nms_threshold=0.3,
        top_k=5000,
    )

    reconocedor = cv2.FaceRecognizerSF.create(
        str(MODELO_RECONOCIMIENTO),
        "",
    )

    if detector is None or reconocedor is None:
        raise RuntimeError("No se pudieron cargar los modelos.")

    print("YuNet: cargado correctamente.")
    print("SFace: cargado correctamente.")


if __name__ == "__main__":
    comprobar_modelos()
