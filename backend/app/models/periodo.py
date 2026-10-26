from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class PeriodoEscolar(Base):
    __tablename__ = "periodos_escolares"

    __table_args__ = (
        CheckConstraint(
            "fecha_fin >= fecha_inicio",
            name="fechas_validas",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(100),
        unique=True,
    )

    fecha_inicio: Mapped[date] = mapped_column(Date)

    fecha_fin: Mapped[date] = mapped_column(Date)

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )