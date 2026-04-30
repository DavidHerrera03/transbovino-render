import hashlib
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.usuario import Usuario
from schemas.usuario import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
)
from utils.email_service import get_email_provider_status, send_reset_email
from utils.env_loader import load_project_env
from utils.security import hash_password, needs_rehash, verify_password

load_project_env()

router = APIRouter(prefix="/auth", tags=["Autenticacion"])


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.get("/email-config")
def email_config():
    """Diagnostico seguro para confirmar que Render esta usando Resend."""
    return get_email_provider_status()


@router.post("/register")
def register(datos: RegisterRequest, db: Session = Depends(get_db)):
    correo_existente = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if correo_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado. Usa otro correo o inicia sesión.")

    cedula_existente = db.query(Usuario).filter(Usuario.id_usuario == datos.id_usuario).first()
    if cedula_existente:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada. Verifica el número o inicia sesión.")

    if datos.rol == "administrador":
        admin_existente = db.query(Usuario).filter(Usuario.rol == "administrador").first()
        if admin_existente:
            raise HTTPException(status_code=400, detail="Solo se permite un administrador en la plataforma")

    nuevo_usuario = Usuario(
        id_usuario=datos.id_usuario,
        nombre=datos.nombre,
        apellido=datos.apellido,
        correo=datos.correo,
        password=hash_password(datos.password),
        telefono=datos.telefono,
        rol=datos.rol,
        estado="activo",
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return {"mensaje": "Usuario registrado correctamente"}


@router.post("/login")
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    entrada = datos.usuario.strip()
    if not entrada or not datos.password.strip():
        raise HTTPException(status_code=400, detail="Debe ingresar usuario y contraseña")

    if entrada.isdigit():
        usuario_db = db.query(Usuario).filter(Usuario.id_usuario == int(entrada)).first()
    else:
        usuario_db = db.query(Usuario).filter(Usuario.correo == entrada).first()

    if not usuario_db or not verify_password(datos.password, usuario_db.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrecta")

    if needs_rehash(usuario_db.password):
        usuario_db.password = hash_password(datos.password)
        db.add(usuario_db)
        db.commit()

    return {
        "mensaje": "Usuario y contraseña correctos",
        "id_usuario": usuario_db.id_usuario,
        "nombre": usuario_db.nombre,
        "apellido": usuario_db.apellido,
        "correo": usuario_db.correo,
        "rol": usuario_db.rol,
    }


@router.post("/forgot-password")
def forgot_password(datos: PasswordResetRequest, db: Session = Depends(get_db)):
    usuario_db = db.query(Usuario).filter(Usuario.correo == datos.correo).first()

    if not usuario_db:
        raise HTTPException(status_code=404, detail="El correo no está registrado a ningún usuario")

    token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(token)
    expira = datetime.utcnow() + timedelta(hours=1)

    usuario_db.reset_token = token_hash
    usuario_db.reset_token_expira = expira
    db.add(usuario_db)
    db.commit()

    reset_base_url = os.getenv('RESET_BASE_URL') or os.getenv('FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{reset_base_url}?vista=restablecer&token={token}"

    try:
        send_reset_email(usuario_db.correo, reset_link, usuario_db.nombre)
    except Exception as exc:
        usuario_db.reset_token = None
        usuario_db.reset_token_expira = None
        db.add(usuario_db)
        db.commit()
        raise HTTPException(status_code=500, detail=f"No se pudo enviar el correo de recuperación: {exc}") from exc

    return {"mensaje": "Se envió un correo para restablecer la contraseña"}


@router.post("/reset-password")
def reset_password(datos: PasswordResetConfirm, db: Session = Depends(get_db)):
    token_hash = _hash_reset_token(datos.token)
    usuario_db = db.query(Usuario).filter(Usuario.reset_token == token_hash).first()

    if not usuario_db or not usuario_db.reset_token_expira:
        raise HTTPException(status_code=400, detail="El enlace de recuperación no es válido")

    if usuario_db.reset_token_expira < datetime.utcnow():
        usuario_db.reset_token = None
        usuario_db.reset_token_expira = None
        db.add(usuario_db)
        db.commit()
        raise HTTPException(status_code=400, detail="El enlace de recuperación expiró. Solicita uno nuevo")

    usuario_db.password = hash_password(datos.password)
    usuario_db.reset_token = None
    usuario_db.reset_token_expira = None
    db.add(usuario_db)
    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}
