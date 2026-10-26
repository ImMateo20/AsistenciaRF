from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.profesores import router as profesores_router
from app.routers.alumnos import router as alumnos_router

app = FastAPI(title="AsistenciaRF")

app.include_router(auth_router)
app.include_router(profesores_router)
app.include_router(alumnos_router)


@app.get("/health")
def comprobar_estado():
    return {"estado": "ok"}
