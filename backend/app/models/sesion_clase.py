from datetime import datetime
from app.utils.fechas import obtener_fecha_utc
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class SesionClase(Base):
    __tablename__ = "sesiones_clase"

    __table_args__ = (
        CheckConstraint(
            "estado IN ('abierta', 'cerrada')",
            name="estado_valido",
        ),
        CheckConstraint(
            """
            (estado = 'abierta' AND fecha_cierre IS NULL)
            OR
            (estado = 'cerrada' AND fecha_cierre IS NOT NULL)
            """,
            name="cierre_coherente",
        ),
        CheckConstraint(
            "fecha_cierre IS NULL OR fecha_cierre >= fecha_inicio",
            name="fechas_validas",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    clase_id: Mapped[int] = mapped_column(
        ForeignKey("clases.id", ondelete="RESTRICT"),
        index=True,
    )

    fecha_inicio: Mapped[datetime] = mapped_column(
        DateTime,
        default=obtener_fecha_utc,
    )

    fecha_cierre: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    estado: Mapped[str] = mapped_column(
        String(10),
        default="abierta",
        server_default="abierta",
    )
