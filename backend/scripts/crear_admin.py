from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import engine
from app.models.usuario import Usuario
from app.security import generar_hash


def crear_administrador():
    try:
        with Session(engine) as sesion:
            administrador = sesion.scalar(
                select(Usuario.id).where(Usuario.rol == "administrador")
            )

            if administrador is not None:
                print("Ya existe un administrador. No se creó otra cuenta.")
                return

            correo = input("Correo del administrador: ").strip().lower()

            if (
                correo.count("@") != 1
                or any(caracter.isspace() for caracter in correo)
                or not all(correo.split("@"))
                or len(correo) > 254
            ):
                print("Introduce un correo válido.")
                return

            usuario_existente = sesion.scalar(
                select(Usuario.id).where(Usuario.correo == correo)
            )

            if usuario_existente is not None:
                print("Ese correo ya está registrado.")
                return

            password = getpass("Contraseña: ")
            confirmacion = getpass("Repite la contraseña: ")

            if not 12 <= len(password) <= 128:
                print("La contraseña debe tener entre 12 y 128 caracteres.")
                return

            if password != confirmacion:
                print("Las contraseñas no coinciden.")
                return

            usuario = Usuario(
                correo=correo,
                password_hash=generar_hash(password),
                rol="administrador",
                activo=True,
            )

            sesion.add(usuario)
            sesion.commit()

            print("Administrador creado correctamente.")

    except IntegrityError:
        print("No se creó la cuenta: hay un conflicto con los datos existentes.")

    except SQLAlchemyError:
        print(
            "No se pudo completar la operación. "
            "Comprueba MySQL, la configuración y las migraciones."
        )

    except (KeyboardInterrupt, EOFError):
        print("\nOperación cancelada.")


if __name__ == "__main__":
    crear_administrador()
