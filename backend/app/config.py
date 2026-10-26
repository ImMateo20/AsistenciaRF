from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

DIRECTORIO_BACKEND = Path(__file__).resolve().parent.parent


class Configuracion(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: SecretStr
    MIGRATION_DB_USER: str
    MIGRATION_DB_PASSWORD: SecretStr

    model_config = SettingsConfigDict(
        env_file=DIRECTORIO_BACKEND / ".env",
        env_file_encoding="utf-8",
    )

    JWT_SECRET_KEY: SecretStr = Field(min_length=64)

    ACCESS_TOKEN_MINUTES: int = Field(
        default=30,
        ge=1,
        le=120,
    )


configuracion = Configuracion()
