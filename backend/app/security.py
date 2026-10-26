from pwdlib import PasswordHash

gestor_password = PasswordHash.recommended()


def generar_hash(password: str) -> str:
    return gestor_password.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    return gestor_password.verify(password, password_hash)
