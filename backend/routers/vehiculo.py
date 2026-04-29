from __future__ import annotations

from pathlib import Path
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.vehiculo import DocumentacionVehiculo, Vehiculo
from models.viaje import Viaje
from schemas.vehiculo import VehiculoCreate
from utils.db_schema import ensure_operational_schema
from utils.firebase_storage import (
    build_vehicle_document_path,
    delete_private_file,
    generate_private_file_url,
    is_firebase_storage_configured,
    upload_private_file,
)
from utils.vehicle_rules import validate_vehicle_ranges

router = APIRouter(prefix="/vehiculos", tags=["Vehiculos"])

ESTADOS_VIAJE_ACTIVOS = {"Asignado", "En ruta"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
UPLOAD_BASE_DIR = Path(__file__).resolve().parent.parent / "uploads" / "vehiculos"


def _serializar_vehiculo(db: Session, vehiculo: Vehiculo):
    documentos_count = (
        db.query(func.count(DocumentacionVehiculo.id))
        .filter(DocumentacionVehiculo.id_vehiculo == vehiculo.id_vehiculo)
        .scalar()
        or 0
    )
    tiene_viaje_activo = (
        db.query(Viaje.id)
        .filter(
            Viaje.id_vehiculo == vehiculo.id_vehiculo,
            Viaje.estado.in_(ESTADOS_VIAJE_ACTIVOS),
        )
        .first()
        is not None
    )

    return {
        "id_vehiculo": vehiculo.id_vehiculo,
        "id_usuario": vehiculo.id_usuario,
        "tipo_vehiculo": vehiculo.tipo_vehiculo,
        "marca": vehiculo.marca,
        "modelo": vehiculo.modelo,
        "peso_max_prom": vehiculo.peso_max_prom,
        "capacidad_bovinos": vehiculo.capacidad_bovinos,
        "descripcion": vehiculo.descripcion,
        "placa": vehiculo.placa,
        "documentos_count": int(documentos_count),
        "disponible": not tiene_viaje_activo,
        "estado_operacion": "Disponible" if not tiene_viaje_activo else "En viaje",
    }


def _obtener_vehiculo_usuario(db: Session, id_vehiculo: int, id_usuario: int) -> Vehiculo:
    vehiculo = (
        db.query(Vehiculo)
        .filter(Vehiculo.id_vehiculo == id_vehiculo, Vehiculo.id_usuario == id_usuario)
        .first()
    )
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehiculo


@router.get("/usuario/{id_usuario}")
def obtener_vehiculos_usuario(id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    vehiculos = (
        db.query(Vehiculo)
        .filter(Vehiculo.id_usuario == id_usuario)
        .order_by(Vehiculo.id_vehiculo.desc())
        .all()
    )
    return [_serializar_vehiculo(db, vehiculo) for vehiculo in vehiculos]


@router.post("/")
def crear_vehiculo(data: VehiculoCreate, db: Session = Depends(get_db)):
    ensure_operational_schema(db)

    if not data.id_usuario:
        raise HTTPException(status_code=400, detail="El id del usuario es obligatorio")

    placa_normalizada = (data.placa or "").strip().upper()
    marca_normalizada = (data.marca or "").strip()

    if not placa_normalizada:
        raise HTTPException(status_code=400, detail="La placa es obligatoria")

    if not marca_normalizada:
        raise HTTPException(status_code=400, detail="La marca del vehículo es obligatoria")

    try:
        tipo_normalizado, _ = validate_vehicle_ranges(
            data.tipo_vehiculo,
            float(data.peso_max_prom),
            int(data.capacidad_bovinos),
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    nuevo = Vehiculo(
        id_usuario=data.id_usuario,
        tipo_vehiculo=tipo_normalizado,
        marca=marca_normalizada,
        modelo=int(data.modelo),
        peso_max_prom=float(data.peso_max_prom),
        capacidad_bovinos=int(data.capacidad_bovinos),
        descripcion=(data.descripcion or "").strip(),
        placa=placa_normalizada,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _serializar_vehiculo(db, nuevo)


@router.delete("/{id_vehiculo}")
def eliminar_vehiculo(id_vehiculo: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)

    vehiculo = _obtener_vehiculo_usuario(db, id_vehiculo, id_usuario)

    viaje_activo = (
        db.query(Viaje.id)
        .filter(
            Viaje.id_vehiculo == id_vehiculo,
            Viaje.estado.in_(ESTADOS_VIAJE_ACTIVOS),
        )
        .first()
    )

    if viaje_activo:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar un vehículo que todavía tiene un viaje en curso o asignado.",
        )

    documentos = (
        db.query(DocumentacionVehiculo)
        .filter(DocumentacionVehiculo.id_vehiculo == id_vehiculo)
        .all()
    )

    for documento in documentos:
        try:
            delete_private_file(str(documento.ruta_archivo or ""))
        except Exception:
            pass
        db.delete(documento)

    carpeta_vehiculo = UPLOAD_BASE_DIR / str(id_vehiculo)
    if carpeta_vehiculo.exists():
        for archivo in carpeta_vehiculo.iterdir():
            if archivo.is_file():
                archivo.unlink(missing_ok=True)
        carpeta_vehiculo.rmdir()

    db.delete(vehiculo)
    db.commit()

    return {"ok": True, "mensaje": "Vehículo eliminado correctamente"}


@router.get("/{id_vehiculo}/documentos")
def obtener_documentos_vehiculo(id_vehiculo: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    _obtener_vehiculo_usuario(db, id_vehiculo, id_usuario)

    documentos = (
        db.query(DocumentacionVehiculo)
        .filter(DocumentacionVehiculo.id_vehiculo == id_vehiculo)
        .order_by(DocumentacionVehiculo.created_at.desc(), DocumentacionVehiculo.id.desc())
        .all()
    )

    return [
        {
            "id": doc.id,
            "id_vehiculo": doc.id_vehiculo,
            "nombre_archivo": doc.nombre_archivo,
            "ruta_archivo": doc.ruta_archivo,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documentos
    ]


@router.get("/{id_vehiculo}/documentos/{id_documento}/url")
def obtener_url_documento_vehiculo(
    id_vehiculo: int,
    id_documento: int,
    id_usuario: int,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    _obtener_vehiculo_usuario(db, id_vehiculo, id_usuario)

    documento = (
        db.query(DocumentacionVehiculo)
        .filter(
            DocumentacionVehiculo.id == id_documento,
            DocumentacionVehiculo.id_vehiculo == id_vehiculo,
        )
        .first()
    )
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    return {"ok": True, "url": generate_private_file_url(documento.ruta_archivo)}


@router.delete("/{id_vehiculo}/documentos/{id_documento}")
def eliminar_documento_vehiculo(
    id_vehiculo: int,
    id_documento: int,
    id_usuario: int,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    _obtener_vehiculo_usuario(db, id_vehiculo, id_usuario)

    documento = (
        db.query(DocumentacionVehiculo)
        .filter(
            DocumentacionVehiculo.id == id_documento,
            DocumentacionVehiculo.id_vehiculo == id_vehiculo,
        )
        .first()
    )
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    try:
        delete_private_file(str(documento.ruta_archivo or ""))
    except Exception:
        pass

    db.delete(documento)
    db.commit()
    return {"ok": True, "mensaje": "Documento eliminado correctamente"}


@router.post("/{id_vehiculo}/documentos")
async def subir_documentos_vehiculo(
    id_vehiculo: int,
    id_usuario: int = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)

    _obtener_vehiculo_usuario(db, id_vehiculo, id_usuario)

    if not files:
        raise HTTPException(status_code=400, detail="Debes adjuntar al menos un archivo")

    carpeta_vehiculo = UPLOAD_BASE_DIR / str(id_vehiculo)
    carpeta_vehiculo.mkdir(parents=True, exist_ok=True)

    guardados = []

    for file in files:
        nombre_original = (file.filename or "").strip()
        extension = Path(nombre_original).suffix.lower()

        if extension not in ALLOWED_DOC_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Solo se permiten archivos PDF, JPG, JPEG o PNG.",
            )

        contenido = await file.read()
        if len(contenido) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo {nombre_original} supera el máximo permitido de 5MB.",
            )

        nombre_seguro = f"{uuid4().hex}{extension}"

        if is_firebase_storage_configured():
            object_path = build_vehicle_document_path(
                id_usuario=id_usuario,
                id_vehiculo=id_vehiculo,
                filename=nombre_seguro,
            )
            ruta_guardada = upload_private_file(
                object_path=object_path,
                content=contenido,
                original_name=nombre_original,
            )
        else:
            destino = carpeta_vehiculo / nombre_seguro
            destino.write_bytes(contenido)
            ruta_guardada = str(destino)

        documento = DocumentacionVehiculo(
            id_vehiculo=id_vehiculo,
            nombre_archivo=nombre_original,
            ruta_archivo=ruta_guardada,
        )
        db.add(documento)
        guardados.append(nombre_original)

    db.commit()

    documentos_count = (
        db.query(func.count(DocumentacionVehiculo.id))
        .filter(DocumentacionVehiculo.id_vehiculo == id_vehiculo)
        .scalar()
        or 0
    )

    return {
        "ok": True,
        "mensaje": "Documentación cargada correctamente",
        "archivos": guardados,
        "documentos_count": int(documentos_count),
    }
