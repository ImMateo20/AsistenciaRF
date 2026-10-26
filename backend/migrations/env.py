from logging.config import fileConfig

from alembic import context
from sqlalchemy import URL, create_engine, pool

import app.models
from app.base import Base
from app.config import configuracion


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


url_migraciones = URL.create(
    drivername="mysql+pymysql",
    username=configuracion.MIGRATION_DB_USER,
    password=configuracion.MIGRATION_DB_PASSWORD.get_secret_value(),
    host=configuracion.DB_HOST,
    port=configuracion.DB_PORT,
    database=configuracion.DB_NAME,
    query={"charset": "utf8mb4"},
)


def ejecutar_sin_conexion():
    context.configure(
        url=url_migraciones,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def ejecutar_con_conexion():
    engine = create_engine(
        url_migraciones,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 5},
    )

    try:
        with engine.connect() as conexion:
            context.configure(
                connection=conexion,
                target_metadata=target_metadata,
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    ejecutar_sin_conexion()
else:
    ejecutar_con_conexion()