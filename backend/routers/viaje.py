from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.viaje import Viaje
from schemas.viaje import ViajeCreate

router = APIRouter(prefix="/viajes", tags=["Viajes"])

@router.post("/")
def crear_viaje(viaje: ViajeCreate, db: Session = Depends(get_db)):
    nuevo = Viaje(**viaje.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/")
def listar_viajes(db: Session = Depends(get_db)):
    return db.query(Viaje).all()