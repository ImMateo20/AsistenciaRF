from fastapi import FastAPI

from app.routers.auth import router as auth_router

app = FastAPI(title="AsistenciaRF")

app.include_router(auth_router)


@app.get("/health")
def comprobar_estado():
    return {"estado": "ok"}
