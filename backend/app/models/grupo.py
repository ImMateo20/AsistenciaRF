from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Grupo(Base):
    __tablename__ = "grupos"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(50),
        unique=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )