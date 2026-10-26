from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base
from app.utils.fechas import obtener_fecha_utc


class TokenRevocado(Base):
    __tablename__ = "tokens_revocados"

    jti: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
    )

    fecha_revocacion: Mapped[datetime] = mapped_column(
        DateTime,
        default=obtener_fecha_utc,
    )

    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime,
        index=True,
    )