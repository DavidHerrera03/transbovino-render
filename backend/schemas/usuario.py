from typing import Optional
import re
from utils.validators import normalize_phone, validate_basic_email
from pydantic import BaseModel, field_validator


def validar_password_segura(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Debe tener al menos 8 caracteres")
    if not re.search(r"[a-z]", value):
        raise ValueError("Debe tener una minúscula")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Debe tener una mayúscula")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise ValueError("Debe tener un carácter especial")
    return value


class UsuarioUpdate(BaseModel):
    nombre: str
    apellido: str
    correo: str
    telefono: str
    password: Optional[str] = None

    @field_validator("correo")
    def validar_correo_update(cls, value):
        return validate_basic_email(value)

    @field_validator("telefono")
    def validar_telefono_update(cls, value):
        return normalize_phone(value)

    @field_validator("password")
    def validar_password_update(cls, value):
        if value in (None, ""):
            return None
        return validar_password_segura(value)


class UsuarioCreate(BaseModel):
    nombre: str
    apellido: str
    correo: str
    password: str
    telefono: str
    rol: str

    @field_validator("correo")
    def validar_correo_create(cls, value):
        return validate_basic_email(value)

    @field_validator("telefono")
    def validar_telefono_create(cls, value):
        return normalize_phone(value)


class LoginRequest(BaseModel):
    usuario: str
    password: str


class PasswordResetRequest(BaseModel):
    correo: str

    @field_validator("correo")
    def validar_correo_reset(cls, value):
        return validate_basic_email(value)


class PasswordResetConfirm(BaseModel):
    token: str
    password: str

    @field_validator("password")
    def validar_password_reset(cls, value):
        return validar_password_segura(value)


class RegisterRequest(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str
    password: str
    telefono: str
    rol: str

    @field_validator("correo")
    def validar_correo_register(cls, value):
        return validate_basic_email(value)

    @field_validator("telefono")
    def validar_telefono_register(cls, value):
        return normalize_phone(value)

    @field_validator("nombre", "apellido", "rol")
    def no_vacios(cls, value):
        if not value.strip():
            raise ValueError("Este campo no puede estar vacío")
        return value

    @field_validator("password")
    def validar_password(cls, value):
        return validar_password_segura(value)
