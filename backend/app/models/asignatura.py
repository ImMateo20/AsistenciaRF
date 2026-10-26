from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Asignatura(Base):
    __tablename__ = "asignaturas"

    id: Mapped[int] = mapped_column(primary_key=True)

    clave: Mapped[str] = mapped_column(
        String(30),
        unique=True,
    )

    nombre: Mapped[str] = mapped_column(String(150))

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )