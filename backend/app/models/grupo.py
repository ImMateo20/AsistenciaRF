from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func, select
from sqlalchemy.orm import column_property

from app.models.alumno import Alumno
from app.base import Base


class Grupo(Base):
    __tablename__ = "grupos"

    id: Mapped[int] = mapped_column(primary_key=True)

    cantidad_alumnos = column_property(
        select(func.count(Alumno.id))
        .where(Alumno.grupo_id == id)
        .correlate_except(Alumno)
        .scalar_subquery()
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        unique=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
    )
