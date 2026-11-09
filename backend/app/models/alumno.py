from sqlalchemy import Boolean, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Alumno(Base):
    __tablename__ = "alumnos"

    id: Mapped[int] = mapped_column(primary_key=True)

    matricula: Mapped[str] = mapped_column(
        String(20),
        unique=True,
    )

    nombre: Mapped[str] = mapped_column(String(150))

    grupo_id: Mapped[int | None] = mapped_column(
        ForeignKey("grupos.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )
