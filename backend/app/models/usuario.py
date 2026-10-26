from sqlalchemy import Boolean, CheckConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    __table_args__ = (
        CheckConstraint(
            "rol IN ('administrador', 'profesor')",
            name="rol_valido",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    correo: Mapped[str] = mapped_column(
        String(254),
        unique=True,
    )

    password_hash: Mapped[str] = mapped_column(String(255))

    rol: Mapped[str] = mapped_column(String(20))

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )