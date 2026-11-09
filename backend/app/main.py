from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import configuracion
from app.routers.auth import router as auth_router
from app.routers.profesores import router as profesores_router
from app.routers.alumnos import router as alumnos_router
from app.routers.asignaturas import router as asignaturas_router
from app.routers.grupos import router as grupos_router
from app.routers.clases import router as clases_router
from app.routers.clases_profesor import router as clases_profesor_router
from app.routers.sesiones_clase import router as sesiones_clase_router

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
app.include_router(asignaturas_router)
app.include_router(grupos_router)
app.include_router(clases_router)
app.include_router(clases_profesor_router)
app.include_router(sesiones_clase_router)


@app.get("/health")
def comprobar_estado():
    return {"estado": "ok"}
