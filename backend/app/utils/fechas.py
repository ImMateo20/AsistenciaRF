from datetime import datetime, timezone


def obtener_fecha_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)