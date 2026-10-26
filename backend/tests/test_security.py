from app.security import generar_hash, verificar_password


def test_password_correcta():
    password = "CLAVEDEPRUEEEEEBA!"
    password_hash = generar_hash(password)

    assert password_hash != password
    assert verificar_password(password, password_hash)


def test_password_incorrecta():
    password_hash = generar_hash("CLAVEDEPRUEEEEEBA!")

    assert not verificar_password("OTRACLABExd", password_hash)


def test_misma_password_genera_hashes_distintos():
    password = "CLAVEDEPRUEEEEEBA!"

    primer_hash = generar_hash(password)
    segundo_hash = generar_hash(password)

    assert primer_hash != segundo_hash
    assert verificar_password(password, primer_hash)
    assert verificar_password(password, segundo_hash)
