# Diseño de la base de datos

## Organización académica
Los alumnos se inscribirán directamente en clases y podrán cursar
asignaturas en distintos grupos.

Cada clase estará relacionada con una asignatura, un grupo,
un profesor y un periodo escolar. Podrá tener varios horarios
durante la semana.

## Tabla prevista
usuarios -> Cuenta de acceso, hash de contraseña, rol y estado 
profesores -> Matrícula, nombre y cuenta de usuario 
alumnos -> Matrícula, nombre y estado 
periodos_escolares -> Nombre del periodo y fechas de inicio y fin 
grupos -> Clave o nombre del grupo 
asignaturas -> Clave, nombre y estado 
clases -> Asignatura, grupo, profesor, periodo y estado 
horarios_clase -> Clase, día de la semana, hora de inicio y fin 
inscripciones_clase -> Alumno, clase, fecha de inscripción y estado 
sesiones_clase -> Clase, inicio, cierre y estado de la sesión 
asistencias -> Sesión, alumno y fecha y hora del registro 
registros_faciales -> Alumno, representación facial y versión del modelo 

## Reglas de inscripción
- Un alumno no podrá tener dos inscripciones activas a la misma clase.
- No podrá cursar la misma asignatura en dos clases del mismo periodo,
  aunque pertenezcan a grupos distintos.
- No podrá inscribirse en clases con horarios que se sobrepongan.
- Las clases consecutivas estarán permitidas.
- Se comprobarán todos los días y horarios de las clases involucradas.
- Los cambios de horario deberán respetar las inscripciones existentes.
- Las inscripciones se administrarán desde la sección Clases.

## Asistencias e historial
- Cada asistencia pertenecerá a un alumno y a una sesión de clase.
- La combinación de alumno y sesión será única en la base de datos.
- Solo podrán registrar asistencia los alumnos inscritos en esa clase
  para la sesión correspondiente.
- Los cambios de inscripción no deberán alterar las asistencias anteriores.
- Una sesión abierta no se utilizará para determinar faltas definitivas.

## Integridad de los datos
- Las matrículas se almacenarán como texto y serán únicas en cada
  catálogo de alumnos o profesores.
- Las relaciones entre tablas utilizarán claves foráneas.
- La hora de fin de una clase deberá ser posterior a la hora de inicio.
- Las contraseñas se almacenarán mediante hash, nunca en texto plano.
- El formato de la representación facial se definirá al elegir el modelo.