from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base
from app.utils.fechas import obtener_fecha_utc


class InscripcionClase(Base):
    __tablename__ = "inscripciones_clase"

    __table_args__ = (
        CheckConstraint(
            "fecha_fin IS NULL OR fecha_fin > fecha_inicio",
            name="fechas_validas",
        ),
        Index(
            "ix_inscripciones_clase_alumno_clase",
            "alumno_id",
            "clase_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="RESTRICT"),
        index=True,
    )

    clase_id: Mapped[int] = mapped_column(
        ForeignKey("clases.id", ondelete="RESTRICT"),
        index=True,
    )

    fecha_inicio: Mapped[datetime] = mapped_column(
        DateTime,
        default=obtener_fecha_utc,
    )

    fecha_fin: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
