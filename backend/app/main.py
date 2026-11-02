from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import configuracion
from app.routers.auth import router as auth_router
from app.routers.profesores import router as profesores_router
from app.routers.alumnos import router as alumnos_router

app = FastAPI(title="AsistenciaRF")

if configuracion.FRONTEND_URL:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            configuracion.FRONTEND_URL.rstrip("/"),
        ],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

app.include_router(auth_router)
app.include_router(profesores_router)
app.include_router(alumnos_router)


@app.get("/health")
def comprobar_estado():
    return {"estado": "ok"}
