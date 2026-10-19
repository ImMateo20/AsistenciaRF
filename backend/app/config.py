from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


DIRECTORIO_BACKEND = Path(__file__).resolve().parent.parent


class Configuracion(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: SecretStr

    model_config = SettingsConfigDict(
        env_file=DIRECTORIO_BACKEND / ".env",
        env_file_encoding="utf-8",
    )


configuracion = Configuracion()