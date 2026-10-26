from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base
from app.utils.fechas import obtener_fecha_utc


class RostroAlumno(Base):
    __tablename__ = "rostros_alumno"

    __table_args__ = (
        UniqueConstraint(
            "alumno_id",
            "numero_muestra",
            name="uq_rostros_alumno_muestra",
        ),
        CheckConstraint(
            "numero_muestra BETWEEN 1 AND 3",
            name="numero_muestra_valido",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="RESTRICT"),
        index=True,
    )

    numero_muestra: Mapped[int] = mapped_column()

    representacion: Mapped[list[float]] = mapped_column(
        JSON,
        nullable=False,
    )

    version_modelo: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime,
        default=obtener_fecha_utc,
    )
