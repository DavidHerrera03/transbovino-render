from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.usuario import Usuario
from schemas.usuario import UsuarioUpdate
from utils.security import hash_password

router = APIRouter(tags=["Perfil"])


@router.get("/perfil/{id_usuario}")
def obtener_perfil(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "usuario": {
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "correo": usuario.correo,
            "telefono": usuario.telefono,
            "rol": usuario.rol,
        }
    }


@router.put("/perfil/{id_usuario}")
def actualizar_perfil(id_usuario: int, data: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.nombre = data.nombre
    usuario.apellido = data.apellido
    usuario.correo = data.correo
    usuario.telefono = data.telefono

    if data.password:
        usuario.password = hash_password(data.password)

    db.commit()
    db.refresh(usuario)
    return {"mensaje": "Perfil actualizado correctamente"}
