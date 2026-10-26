from app.models.alumno import Alumno
from app.models.asistencia import Asistencia
from app.models.asignatura import Asignatura
from app.models.clase import Clase
from app.models.grupo import Grupo
from app.models.horario_clase import HorarioClase
from app.models.inscripcion_clase import InscripcionClase
from app.models.periodo import PeriodoEscolar
from app.models.profesor import Profesor
from app.models.sesion_clase import SesionClase
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.models.rostro_alumno import RostroAlumno

__all__ = [
    "Alumno",
    "Asistencia",
    "Asignatura",
    "Clase",
    "Grupo",
    "HorarioClase",
    "InscripcionClase",
    "PeriodoEscolar",
    "Profesor",
    "RostroAlumno",
    "SesionClase",
    "TokenRevocado",
    "Usuario",
]
