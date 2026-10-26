from datetime import datetime
from app.utils.fechas import obtener_fecha_utc
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Asistencia(Base):
    __tablename__ = "asistencias"

    __table_args__ = (
        UniqueConstraint(
            "sesion_id",
            "alumno_id",
            name="uq_asistencias_sesion_alumno",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    sesion_id: Mapped[int] = mapped_column(
        ForeignKey("sesiones_clase.id", ondelete="RESTRICT"),
        index=True,
    )

    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="RESTRICT"),
        index=True,
    )

    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime,
        default=obtener_fecha_utc,
    )
