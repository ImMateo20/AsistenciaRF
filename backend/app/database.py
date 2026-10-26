from collections.abc import Generator

from sqlalchemy.orm import Session

from sqlalchemy import URL, create_engine

from app.config import configuracion

url_conexion = URL.create(
    drivername="mysql+pymysql",
    username=configuracion.DB_USER,
    password=configuracion.DB_PASSWORD.get_secret_value(),
    host=configuracion.DB_HOST,
    port=configuracion.DB_PORT,
    database=configuracion.DB_NAME,
    query={"charset": "utf8mb4"},
)

engine = create_engine(
    url_conexion,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)

def obtener_db() -> Generator[Session, None, None]:
    with Session(engine) as sesion:
        yield sesion