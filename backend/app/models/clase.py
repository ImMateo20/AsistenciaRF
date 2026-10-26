from sqlalchemy import Boolean, ForeignKey, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Clase(Base):
    __tablename__ = "clases"

    __table_args__ = (
        UniqueConstraint(
            "asignatura_id",
            "grupo_id",
            "periodo_id",
            name="uq_clases_asignatura_grupo_periodo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    asignatura_id: Mapped[int] = mapped_column(
        ForeignKey("asignaturas.id", ondelete="RESTRICT"),
        index=True,
    )

    grupo_id: Mapped[int] = mapped_column(
        ForeignKey("grupos.id", ondelete="RESTRICT"),
        index=True,
    )

    profesor_id: Mapped[int] = mapped_column(
        ForeignKey("profesores.id", ondelete="RESTRICT"),
        index=True,
    )

    periodo_id: Mapped[int] = mapped_column(
        ForeignKey("periodos_escolares.id", ondelete="RESTRICT"),
        index=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )