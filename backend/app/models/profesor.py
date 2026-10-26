from sqlalchemy import Boolean, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Profesor(Base):
    __tablename__ = "profesores"

    id: Mapped[int] = mapped_column(primary_key=True)

    matricula: Mapped[str] = mapped_column(
        String(20),
        unique=True,
    )

    nombre: Mapped[str] = mapped_column(String(150))

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        unique=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )