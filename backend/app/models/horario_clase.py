from datetime import time

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    SmallInteger,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class HorarioClase(Base):
    __tablename__ = "horarios_clase"

    __table_args__ = (
        CheckConstraint(
            "dia_semana BETWEEN 1 AND 7",
            name="dia_valido",
        ),
        CheckConstraint(
            "hora_fin > hora_inicio",
            name="horas_validas",
        ),
        UniqueConstraint(
            "clase_id",
            "dia_semana",
            "hora_inicio",
            "hora_fin",
            name="uq_horarios_clase_bloque",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    clase_id: Mapped[int] = mapped_column(
        ForeignKey("clases.id", ondelete="RESTRICT"),
        index=True,
    )

    dia_semana: Mapped[int] = mapped_column(SmallInteger)

    hora_inicio: Mapped[time] = mapped_column(Time)

    hora_fin: Mapped[time] = mapped_column(Time)