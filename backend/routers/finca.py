from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models.finca import Finca
from models.usuario import Usuario
from schemas.finca import FincaCreate, FincaUpdate
from utils.tarifas import vereda_permitida, normalizar_vereda

router = APIRouter(prefix="/fincas", tags=["Fincas"])

@router.get("/usuario/{id_usuario}")
def listar_fincas_usuario(id_usuario: int, db: Session = Depends(get_db)):
    return db.query(Finca).filter(Finca.id_usuario == id_usuario).all()

@router.get("/catalogo")
def catalogo_fincas(db: Session = Depends(get_db)):
    fincas = db.query(Finca).all()
    resultado = []
    for finca in fincas:
        usuario = db.query(Usuario).filter(Usuario.id_usuario == finca.id_usuario).first()
        resultado.append({
            "id_finca": finca.id_finca,
            "nombre_finca": finca.nombre_finca,
            "municipio": finca.municipio,
            "vereda": finca.vereda,
            "referencia": finca.referencia,
            "id_usuario": finca.id_usuario,
            "propietario": f"{usuario.nombre} {usuario.apellido}" if usuario else "Sin propietario",
        })
    return resultado

@router.get("/{id_finca}")
def obtener_finca(id_finca: int, db: Session = Depends(get_db)):
    finca = db.query(Finca).filter(Finca.id_finca == id_finca).first()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    usuario = db.query(Usuario).filter(Usuario.id_usuario == finca.id_usuario).first()
    return {
        "id_finca": finca.id_finca,
        "nombre_finca": finca.nombre_finca,
        "municipio": finca.municipio,
        "vereda": finca.vereda,
        "referencia": finca.referencia,
        "id_usuario": finca.id_usuario,
        "propietario": f"{usuario.nombre} {usuario.apellido}" if usuario else "Sin propietario",
    }

@router.post("/")
def crear_finca(data: FincaCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first()
    if not usuario:
      raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not vereda_permitida(data.vereda):
        raise HTTPException(status_code=400, detail="La vereda seleccionada no está permitida")

    nueva = Finca(
        nombre_finca=data.nombre_finca,
        municipio="Zipaquira",
        vereda=normalizar_vereda(data.vereda),
        referencia=data.referencia,
        id_usuario=data.id_usuario,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.put("/{id_finca}")
def actualizar_finca(id_finca: int, data: FincaUpdate, db: Session = Depends(get_db)):
    finca = db.query(Finca).filter(Finca.id_finca == id_finca, Finca.id_usuario == data.id_usuario).first()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada para este usuario")

    if not vereda_permitida(data.vereda):
        raise HTTPException(status_code=400, detail="La vereda seleccionada no está permitida")

    finca.nombre_finca = data.nombre_finca
    finca.municipio = "Zipaquira"
    finca.vereda = normalizar_vereda(data.vereda)
    finca.referencia = data.referencia
    db.commit()
    db.refresh(finca)
    return finca


@router.delete("/{id_finca}")
def eliminar_finca(id_finca: int, id_usuario: int, db: Session = Depends(get_db)):
    finca = db.query(Finca).filter(Finca.id_finca == id_finca, Finca.id_usuario == id_usuario).first()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada para este usuario")

    bovino_asociado = db.execute(text("SELECT id_bovino FROM bovino WHERE id_finca = :id_finca LIMIT 1"), {"id_finca": id_finca}).fetchone()
    if bovino_asociado:
        raise HTTPException(status_code=400, detail="No puedes eliminar la finca porque tiene bovinos asociados")

    solicitud_origen = db.execute(text("SELECT id FROM solicitudes WHERE id_finca_origen = :id_finca OR id_finca_destino = :id_finca LIMIT 1"), {"id_finca": id_finca}).fetchone()
    if solicitud_origen:
        raise HTTPException(status_code=400, detail="No puedes eliminar la finca porque está asociada a solicitudes registradas")

    db.delete(finca)
    db.commit()
    return {"detail": "Finca eliminada correctamente"}
