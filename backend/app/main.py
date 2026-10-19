from fastapi import FastAPI

app = FastAPI(title="AsistenciaRF")


@app.get("/health")
def comprobar_estado():
    return {"estado": "ok"}
