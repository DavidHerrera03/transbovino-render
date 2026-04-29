from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models.bovino import Bovino, DocumentacionBovino
from models.bovino_movimiento import BovinoMovimiento
from models.finca import Finca
from schemas.bovino import BovinoCreate, BovinoUpdate
from utils.db_schema import ensure_operational_schema
from utils.firebase_storage import (
    build_bovino_document_path,
    delete_private_file,
    generate_private_file_url,
    is_firebase_storage_configured,
    upload_private_file,
)

router = APIRouter(prefix="/bovinos", tags=["Bovinos"])

ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
UPLOAD_BASE_DIR = Path(__file__).resolve().parent.parent / "uploads" / "bovinos"


def codigo_bovino_existe_en_usuario(
    db: Session,
    *,
    codigo_bovino: int | None,
    id_usuario: int | None,
    exclude_id: int | None = None,
) -> bool:
    if codigo_bovino is None or id_usuario is None:
        return False

    query = db.query(Bovino).filter(
        Bovino.codigo_bovino == int(codigo_bovino),
        Bovino.id_usuario == int(id_usuario),
        Bovino.estado == "activo",
    )

    if exclude_id is not None:
        query = query.filter(Bovino.id_bovino != int(exclude_id))

    return db.query(query.exists()).scalar()


def _obtener_bovino_usuario(db: Session, id_bovino: int, id_usuario: int) -> Bovino:
    bovino = (
        db.query(Bovino)
        .filter(Bovino.id_bovino == id_bovino, Bovino.id_usuario == id_usuario)
        .first()
    )
    if not bovino:
        raise HTTPException(status_code=404, detail="Bovino no encontrado")
    return bovino


@router.post("/")
def crear_bovino(data: BovinoCreate, db: Session = Depends(get_db)):
    ensure_operational_schema(db)

    finca = (
        db.query(Finca)
        .filter(Finca.id_finca == data.id_finca, Finca.id_usuario == data.id_usuario)
        .first()
    )
    if not finca:
        raise HTTPException(status_code=400, detail="Debes seleccionar una finca válida del usuario")

    if codigo_bovino_existe_en_usuario(
        db,
        codigo_bovino=data.codigo_bovino,
        id_usuario=data.id_usuario,
    ):
        raise HTTPException(
            status_code=400,
            detail="Ya existe un bovino con ese código para este usuario. Debe ser único dentro de sus bovinos.",
        )

    nuevo = Bovino(
        codigo_bovino=data.codigo_bovino,
        raza=data.raza,
        peso_promedio=data.peso_promedio,
        observaciones=data.observaciones,
        edad=data.edad,
        id_usuario=data.id_usuario,
        id_finca=data.id_finca,
        estado=data.estado or "activo",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"ok": True, "id_bovino": nuevo.id_bovino}


@router.put("/{id_bovino}")
def actualizar_bovino(id_bovino: int, data: BovinoUpdate, db: Session = Depends(get_db)):
    ensure_operational_schema(db)

    bovino = (
        db.query(Bovino)
        .filter(Bovino.id_bovino == id_bovino, Bovino.id_usuario == data.id_usuario)
        .first()
    )
    if not bovino:
        raise HTTPException(status_code=404, detail="Bovino no encontrado")

    finca = (
        db.query(Finca)
        .filter(Finca.id_finca == data.id_finca, Finca.id_usuario == data.id_usuario)
        .first()
    )
    if not finca:
        raise HTTPException(status_code=400, detail="Debes seleccionar una finca válida del usuario")

    if codigo_bovino_existe_en_usuario(
        db,
        codigo_bovino=data.codigo_bovino,
        id_usuario=data.id_usuario,
        exclude_id=id_bovino,
    ):
        raise HTTPException(
            status_code=400,
            detail="Ya existe un bovino con ese código para este usuario. Debe ser único dentro de sus bovinos.",
        )

    bovino.codigo_bovino = data.codigo_bovino
    bovino.raza = data.raza
    bovino.peso_promedio = data.peso_promedio
    bovino.observaciones = data.observaciones
    bovino.edad = data.edad
    bovino.id_finca = data.id_finca
    if data.estado is not None:
        bovino.estado = data.estado

    db.add(bovino)
    db.commit()
    db.refresh(bovino)
    return {"ok": True, "id_bovino": bovino.id_bovino}


@router.get("/")
def obtener_bovinos(db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    return db.query(Bovino).all()


@router.get("/usuario/{id_usuario}")
def obtener_bovinos_usuario(id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    resultados = (
        db.query(Bovino, Finca)
        .outerjoin(Finca, Finca.id_finca == Bovino.id_finca)
        .filter(Bovino.id_usuario == id_usuario, Bovino.estado == "activo")
        .order_by(Finca.nombre_finca.asc(), Bovino.id_bovino.desc())
        .all()
    )
    return [
        {
            "id_bovino": bovino.id_bovino,
            "codigo_bovino": bovino.codigo_bovino,
            "raza": bovino.raza,
            "peso_promedio": bovino.peso_promedio,
            "observaciones": bovino.observaciones,
            "edad": bovino.edad,
            "id_usuario": bovino.id_usuario,
            "id_finca": bovino.id_finca,
            "nombre_finca": finca.nombre_finca if finca else "Sin finca asignada",
            "vereda_finca": finca.vereda if finca else None,
            "municipio_finca": finca.municipio if finca else "Zipaquira",
        }
        for bovino, finca in resultados
    ]



@router.delete("/{id_bovino}")
def inactivar_bovino_usuario(id_bovino: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    bovino = _obtener_bovino_usuario(db, id_bovino, id_usuario)
    if bovino.estado != "activo":
        return {"ok": True, "mensaje": "El bovino ya se encuentra inactivo", "id_bovino": bovino.id_bovino}
    bovino.estado = "inactivo"
    db.add(bovino)
    db.commit()
    db.refresh(bovino)
    return {"ok": True, "mensaje": "Bovino eliminado del listado activo", "id_bovino": bovino.id_bovino}

@router.get("/{id_bovino}/trazabilidad")
def obtener_trazabilidad_bovino(id_bovino: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    _obtener_bovino_usuario(db, id_bovino, id_usuario)

    movimientos = (
        db.query(BovinoMovimiento, Finca)
        .outerjoin(Finca, Finca.id_finca == BovinoMovimiento.id_finca_destino)
        .filter(BovinoMovimiento.id_bovino == id_bovino)
        .order_by(BovinoMovimiento.fecha.desc(), BovinoMovimiento.id.desc())
        .all()
    )

    return [
        {
            "id": mov.id,
            "tipo_movimiento": mov.tipo_movimiento,
            "fecha": mov.fecha.isoformat() if mov.fecha else None,
            "descripcion": mov.observacion or "Sin detalle",
            "finca_destino": finca.nombre_finca if finca else None,
            "vereda_destino": finca.vereda if finca else None,
            "municipio_destino": finca.municipio if finca else None,
        }
        for mov, finca in movimientos
    ]


@router.get("/{id_bovino}/documentos")
def obtener_documentos_bovino(id_bovino: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    _obtener_bovino_usuario(db, id_bovino, id_usuario)

    documentos = (
        db.query(DocumentacionBovino)
        .filter(DocumentacionBovino.id_bovino == id_bovino)
        .order_by(DocumentacionBovino.created_at.desc(), DocumentacionBovino.id.desc())
        .all()
    )

    return [
        {
            "id": doc.id,
            "id_bovino": doc.id_bovino,
            "nombre_archivo": doc.nombre_archivo,
            "ruta_archivo": doc.ruta_archivo,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documentos
    ]


@router.post("/{id_bovino}/documentos")
async def subir_documento_bovino(
    id_bovino: int,
    id_usuario: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    _obtener_bovino_usuario(db, id_bovino, id_usuario)

    nombre_original = (archivo.filename or "").strip()
    extension = Path(nombre_original).suffix.lower()

    if extension not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF, JPG, JPEG o PNG.")

    contenido = await archivo.read()
    if len(contenido) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el máximo permitido de 5MB.")

    carpeta = UPLOAD_BASE_DIR / str(id_bovino)
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_seguro = f"{uuid4().hex}{extension}"

    if is_firebase_storage_configured():
        object_path = build_bovino_document_path(
            id_usuario=id_usuario,
            id_bovino=id_bovino,
            filename=nombre_seguro,
        )
        ruta_guardada = upload_private_file(
            object_path=object_path,
            content=contenido,
            original_name=nombre_original,
        )
    else:
        destino = carpeta / nombre_seguro
        destino.write_bytes(contenido)
        ruta_guardada = str(destino)

    documento = DocumentacionBovino(
        id_bovino=id_bovino,
        nombre_archivo=nombre_original,
        ruta_archivo=ruta_guardada,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)

    return {
        "ok": True,
        "id": documento.id,
        "nombre_archivo": documento.nombre_archivo,
    }


@router.get("/documentos/{id_documento}")
def obtener_url_documento_bovino(id_documento: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    documento = (
        db.query(DocumentacionBovino, Bovino)
        .join(Bovino, Bovino.id_bovino == DocumentacionBovino.id_bovino)
        .filter(DocumentacionBovino.id == id_documento, Bovino.id_usuario == id_usuario)
        .first()
    )
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    doc, _ = documento
    url = generate_private_file_url(doc.ruta_archivo)
    return {"ok": True, "url": url}


@router.delete("/documentos/{id_documento}")
def eliminar_documento_bovino(id_documento: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    documento = (
        db.query(DocumentacionBovino, Bovino)
        .join(Bovino, Bovino.id_bovino == DocumentacionBovino.id_bovino)
        .filter(DocumentacionBovino.id == id_documento, Bovino.id_usuario == id_usuario)
        .first()
    )
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    doc, _ = documento
    try:
        delete_private_file(doc.ruta_archivo)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
    return {"ok": True, "mensaje": "Documento eliminado correctamente"}
