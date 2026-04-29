import re


def normalize_phone(value) -> str:
    digits = re.sub(r"\D", "", str(value or ""))[:10]
    if not re.fullmatch(r"3\d{9}", digits):
        raise ValueError("El teléfono debe iniciar con 3 y tener exactamente 10 números. Ejemplo: 300 123 4567")
    return digits


def normalize_optional_phone(value):
    if value in (None, ""):
        return None
    return normalize_phone(value)


def validate_basic_email(value: str) -> str:
    email = str(value or "").strip()
    if "@" not in email:
        raise ValueError("El correo debe contener mínimo el símbolo @")
    return email
