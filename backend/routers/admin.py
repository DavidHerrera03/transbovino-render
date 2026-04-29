from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.bovino import Bovino, DocumentacionBovino
from models.finca import Finca
from models.solicitud import Solicitud, SolicitudBovino, SolicitudOferta
from models.usuario import Usuario
from models.vehiculo import Vehiculo, DocumentacionVehiculo
from models.viaje import Viaje
from schemas.bovino import BovinoCreate, BovinoUpdate
from schemas.finca import FincaCreate
from schemas.usuario import RegisterRequest, UsuarioUpdate
from schemas.vehiculo import VehiculoCreate
from utils.db_schema import ensure_operational_schema
from utils.firebase_storage import generate_private_file_url
from utils.security import hash_password
from utils.tarifas import normalizar_vereda, vereda_permitida
from utils.vehicle_rules import validate_vehicle_ranges

router = APIRouter(prefix="/admin", tags=["Administrador"])


def _admin_count(db: Session) -> int:
    return db.query(func.count(Usuario.id_usuario)).filter(Usuario.rol == "administrador").scalar() or 0




def _require_campesino(usuario: Usuario | None):
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.rol != "campesino":
        raise HTTPException(status_code=400, detail="Solo los usuarios con rol campesino pueden tener fincas o bovinos")


ESTADOS_VIAJE = {"Asignado", "En ruta", "Completado"}
ORDEN_ESTADOS_VIAJE = {"Asignado": 0, "En ruta": 1, "Completado": 2}

class EstadoViajeAdminPayload(BaseModel):
    estado: str

def _calcular_progreso(estado: str | None) -> int:
    return {"Asignado": 33, "En ruta": 66, "Completado": 100}.get(estado or "", 0)

def _doc_links(path: str | None, filename: str | None = None):
    if not path or path == "pendiente":
        return {"view": None, "download": None}
    if str(path).startswith("gs://"):
        try:
            return {"view": generate_private_file_url(path), "download": generate_private_file_url(path, download=True, download_name=filename)}
        except Exception:
            return {"view": None, "download": None}
    return {"view": path, "download": path}

def _serializar_usuario(usuario: Usuario):
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "correo": usuario.correo,
        "telefono": usuario.telefono,
        "rol": usuario.rol,
        "estado": usuario.estado,
        "nombre_completo": f"{usuario.nombre} {usuario.apellido}",
    }


def _serializar_finca(db: Session, finca: Finca):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == finca.id_usuario).first()
    return {
        "id_finca": finca.id_finca,
        "nombre_finca": finca.nombre_finca,
        "municipio": finca.municipio,
        "vereda": finca.vereda,
        "referencia": finca.referencia,
        "id_usuario": finca.id_usuario,
        "usuario": _serializar_usuario(usuario) if usuario else None,
    }


def _serializar_bovino(db: Session, bovino: Bovino):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == bovino.id_usuario).first()
    finca = db.query(Finca).filter(Finca.id_finca == bovino.id_finca).first()
    return {
        "id_bovino": bovino.id_bovino,
        "codigo_bovino": bovino.codigo_bovino,
        "raza": bovino.raza,
        "peso_promedio": bovino.peso_promedio,
        "observaciones": bovino.observaciones,
        "edad": bovino.edad,
        "estado": bovino.estado,
        "id_usuario": bovino.id_usuario,
        "id_finca": bovino.id_finca,
        "usuario": _serializar_usuario(usuario) if usuario else None,
        "documentos": _documentos_bovino(db, bovino.id_bovino),
        "finca": {
            "id_finca": finca.id_finca,
            "nombre_finca": finca.nombre_finca,
            "vereda": finca.vereda,
        } if finca else None,
    }


def _serializar_vehiculo(db: Session, vehiculo: Vehiculo):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == vehiculo.id_usuario).first()
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
        "usuario": _serializar_usuario(usuario) if usuario else None,
        "documentos": _documentos_vehiculo(db, vehiculo.id_vehiculo),
    }


def _bovinos_por_solicitud(db: Session, solicitud_id: int):
    filas = (
        db.query(Bovino, Finca)
        .join(SolicitudBovino, SolicitudBovino.bovino_id == Bovino.id_bovino)
        .outerjoin(Finca, Finca.id_finca == Bovino.id_finca)
        .filter(SolicitudBovino.solicitud_id == solicitud_id)
        .order_by(Bovino.id_bovino.asc())
        .all()
    )
    return [{
        "id_bovino": b.id_bovino,
        "codigo_bovino": b.codigo_bovino,
        "raza": b.raza,
        "peso_promedio": b.peso_promedio,
        "edad": b.edad,
        "estado": b.estado,
        "observaciones": b.observaciones,
        "nombre_finca": f.nombre_finca if f else None,
        "vereda_finca": f.vereda if f else None,
        "municipio_finca": f.municipio if f else None,
    } for b, f in filas]

def _documentos_bovino(db: Session, id_bovino: int):
    documentos = db.query(DocumentacionBovino).filter(DocumentacionBovino.id_bovino == id_bovino).order_by(DocumentacionBovino.created_at.desc()).all()
    return [{"id": d.id, "nombre_archivo": d.nombre_archivo, "url": _doc_links(d.ruta_archivo, d.nombre_archivo)["view"], "download_url": _doc_links(d.ruta_archivo, d.nombre_archivo)["download"], "created_at": d.created_at.isoformat() if d.created_at else None} for d in documentos]

def _documentos_vehiculo(db: Session, id_vehiculo: int):
    documentos = db.query(DocumentacionVehiculo).filter(DocumentacionVehiculo.id_vehiculo == id_vehiculo).order_by(DocumentacionVehiculo.created_at.desc()).all()
    return [{"id": d.id, "nombre_archivo": d.nombre_archivo, "url": _doc_links(d.ruta_archivo, d.nombre_archivo)["view"], "download_url": _doc_links(d.ruta_archivo, d.nombre_archivo)["download"], "created_at": d.created_at.isoformat() if d.created_at else None} for d in documentos]

def _ofertas_por_solicitud(db: Session, solicitud_id: int):
    filas = (db.query(SolicitudOferta, Usuario).join(Usuario, Usuario.id_usuario == SolicitudOferta.transportador_id).filter(SolicitudOferta.solicitud_id == solicitud_id).order_by(SolicitudOferta.updated_at.desc()).all())
    return [{"id": o.id, "transportador_id": o.transportador_id, "transportador_nombre": f"{u.nombre} {u.apellido}".strip(), "valor_oferta": float(o.valor_oferta or 0), "estado": o.estado, "propuesta_por": o.propuesta_por, "updated_at": o.updated_at.isoformat() if o.updated_at else None} for o, u in filas]

def _serializar_solicitud(db: Session, solicitud: Solicitud):
    campesino = db.query(Usuario).filter(Usuario.id_usuario == solicitud.id_usuario).first()
    transportador = db.query(Usuario).filter(Usuario.id_usuario == solicitud.id_transportador).first() if solicitud.id_transportador else None
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == solicitud.id_vehiculo).first() if solicitud.id_vehiculo else None
    guia_links = _doc_links(solicitud.guia_movilidad_ruta, solicitud.guia_movilidad_nombre)
    adicional_links = _doc_links(solicitud.info_adicional_ruta, solicitud.info_adicional_nombre)
    return {
        "id": solicitud.id, "codigo": solicitud.codigo, "tipo_solicitud": solicitud.tipo_solicitud,
        "origen": solicitud.origen, "destino": solicitud.destino, "fecha": solicitud.fecha, "hora_recogida": solicitud.hora_recogida,
        "estado": solicitud.estado, "progreso": _calcular_progreso(solicitud.estado),
        "contacto_entrega": solicitud.contacto_entrega, "telefono_contacto": solicitud.telefono_contacto,
        "observaciones": solicitud.observaciones, "observaciones_ganado": solicitud.observaciones_ganado,
        "distancia_km": float(solicitud.distancia_km or 0), "tarifa_minima": float(solicitud.tarifa_minima or 0), "valor_referencia_campesino": float(solicitud.valor_referencia_campesino or 0),
        "campesino": _serializar_usuario(campesino) if campesino else None, "transportador": _serializar_usuario(transportador) if transportador else None,
        "vehiculo": _serializar_vehiculo(db, vehiculo) if vehiculo else None,
        "bovinos": _bovinos_por_solicitud(db, solicitud.id), "ofertas": _ofertas_por_solicitud(db, solicitud.id),
        "guia_movilidad_nombre": solicitud.guia_movilidad_nombre, "guia_movilidad_url": guia_links["view"], "guia_movilidad_download_url": guia_links["download"],
        "info_adicional_nombre": solicitud.info_adicional_nombre, "info_adicional_url": adicional_links["view"], "info_adicional_download_url": adicional_links["download"],
    }

def _serializar_viaje(db: Session, viaje: Viaje):
    solicitud = db.query(Solicitud).filter(Solicitud.id == viaje.solicitud_id).first() if viaje.solicitud_id else None
    transportador = db.query(Usuario).filter(Usuario.id_usuario == viaje.id_transportador).first() if viaje.id_transportador else None
    campesino = db.query(Usuario).filter(Usuario.id_usuario == solicitud.id_usuario).first() if solicitud else None
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == viaje.id_vehiculo).first() if viaje.id_vehiculo else None
    guia_links = _doc_links(solicitud.guia_movilidad_ruta, solicitud.guia_movilidad_nombre) if solicitud else {"view": None, "download": None}
    adicional_links = _doc_links(solicitud.info_adicional_ruta, solicitud.info_adicional_nombre) if solicitud else {"view": None, "download": None}
    return {
        "id": viaje.id, "id_viaje": viaje.id, "solicitud_id": viaje.solicitud_id, "solicitud_codigo": solicitud.codigo if solicitud else None,
        "origen": viaje.origen, "destino": viaje.destino, "fecha": viaje.fecha, "estado": viaje.estado, "progreso": _calcular_progreso(viaje.estado),
        "distancia_km": float(solicitud.distancia_km or 0) if solicitud else 0, "tarifa_minima": float(solicitud.tarifa_minima or 0) if solicitud else 0, "valor_referencia_campesino": float(solicitud.valor_referencia_campesino or 0) if solicitud else 0,
        "transportador": _serializar_usuario(transportador) if transportador else None, "campesino": _serializar_usuario(campesino) if campesino else None,
        "vehiculo": _serializar_vehiculo(db, vehiculo) if vehiculo else None,
        "bovinos": _bovinos_por_solicitud(db, viaje.solicitud_id) if viaje.solicitud_id else [],
        "cantidad_bovinos": len(_bovinos_por_solicitud(db, viaje.solicitud_id)) if viaje.solicitud_id else 0,
        "guia_movilidad_nombre": solicitud.guia_movilidad_nombre if solicitud else None, "guia_movilidad_url": guia_links["view"], "guia_movilidad_download_url": guia_links["download"],
        "info_adicional_nombre": solicitud.info_adicional_nombre if solicitud else None, "info_adicional_url": adicional_links["view"], "info_adicional_download_url": adicional_links["download"],
    }
@router.get("/resumen")
def resumen(db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    return {
        "usuarios": db.query(func.count(Usuario.id_usuario)).scalar() or 0,
        "campesinos": db.query(func.count(Usuario.id_usuario)).filter(Usuario.rol == "campesino").scalar() or 0,
        "transportadores": db.query(func.count(Usuario.id_usuario)).filter(Usuario.rol == "transportador").scalar() or 0,
        "administradores": _admin_count(db),
        "fincas": db.query(func.count(Finca.id_finca)).scalar() or 0,
        "bovinos": db.query(func.count(Bovino.id_bovino)).scalar() or 0,
        "vehiculos": db.query(func.count(Vehiculo.id_vehiculo)).scalar() or 0,
        "solicitudes": db.query(func.count(Solicitud.id)).scalar() or 0,
        "viajes": db.query(func.count(Viaje.id)).scalar() or 0,
    }


@router.get("/usuarios")
def listar_usuarios(rol: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Usuario)
    if rol:
        query = query.filter(Usuario.rol == rol)
    return [_serializar_usuario(usuario) for usuario in query.order_by(Usuario.nombre.asc()).all()]


@router.post("/usuarios")
def crear_usuario(data: RegisterRequest, db: Session = Depends(get_db)):
    correo_existente = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if correo_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado. Usa otro correo para crear el usuario.")

    cedula_existente = db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first()
    if cedula_existente:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada. Verifica el número del usuario.")

    if data.rol == "administrador" and _admin_count(db) >= 1:
        raise HTTPException(status_code=400, detail="Solo se permite un administrador en la plataforma")

    nuevo = Usuario(
        id_usuario=data.id_usuario,
        nombre=data.nombre,
        apellido=data.apellido,
        correo=data.correo,
        telefono=data.telefono,
        rol=data.rol,
        password=hash_password(data.password),
        estado="activo",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _serializar_usuario(nuevo)


@router.put("/usuarios/{id_usuario}")
def actualizar_usuario(id_usuario: int, data: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    correo_existente = db.query(Usuario).filter(Usuario.correo == data.correo, Usuario.id_usuario != id_usuario).first()
    if correo_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado por otro usuario")

    usuario.nombre = data.nombre
    usuario.apellido = data.apellido
    usuario.correo = data.correo
    usuario.telefono = data.telefono
    if data.password:
        usuario.password = hash_password(data.password)

    db.commit()
    db.refresh(usuario)
    return _serializar_usuario(usuario)


@router.delete("/usuarios/{id_usuario}")
def eliminar_usuario(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.rol == "administrador":
        raise HTTPException(status_code=400, detail="El administrador único no se puede eliminar desde este módulo")

    if db.query(Finca).filter(Finca.id_usuario == id_usuario).first() or db.query(Bovino).filter(Bovino.id_usuario == id_usuario).first() or db.query(Vehiculo).filter(Vehiculo.id_usuario == id_usuario).first() or db.query(Solicitud).filter((Solicitud.id_usuario == id_usuario) | (Solicitud.id_transportador == id_usuario)).first() or db.query(Viaje).filter(Viaje.id_transportador == id_usuario).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar el usuario porque tiene información asociada en la plataforma")

    db.delete(usuario)
    db.commit()
    return {"ok": True, "mensaje": "Usuario eliminado correctamente"}


@router.get("/fincas")
def listar_fincas(db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    fincas = db.query(Finca).order_by(Finca.id_finca.desc()).all()
    return [_serializar_finca(db, finca) for finca in fincas]


@router.post("/fincas")
def crear_finca_admin(data: FincaCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first()
    _require_campesino(usuario)
    if not vereda_permitida(data.vereda):
        raise HTTPException(status_code=400, detail="La vereda seleccionada no está permitida")
    finca = Finca(
        nombre_finca=data.nombre_finca,
        municipio="Zipaquira",
        vereda=normalizar_vereda(data.vereda),
        referencia=data.referencia,
        id_usuario=data.id_usuario,
    )
    db.add(finca)
    db.commit()
    db.refresh(finca)
    return _serializar_finca(db, finca)


@router.put("/fincas/{id_finca}")
def actualizar_finca_admin(id_finca: int, data: FincaCreate, db: Session = Depends(get_db)):
    finca = db.query(Finca).filter(Finca.id_finca == id_finca).first()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    usuario = db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first()
    _require_campesino(usuario)
    if not vereda_permitida(data.vereda):
        raise HTTPException(status_code=400, detail="La vereda seleccionada no está permitida")
    finca.nombre_finca = data.nombre_finca
    finca.municipio = "Zipaquira"
    finca.vereda = normalizar_vereda(data.vereda)
    finca.referencia = data.referencia
    finca.id_usuario = data.id_usuario
    db.commit()
    db.refresh(finca)
    return _serializar_finca(db, finca)


@router.delete("/fincas/{id_finca}")
def eliminar_finca_admin(id_finca: int, db: Session = Depends(get_db)):
    finca = db.query(Finca).filter(Finca.id_finca == id_finca).first()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    if db.query(Bovino).filter(Bovino.id_finca == id_finca).first() or db.query(Solicitud).filter((Solicitud.id_finca_origen == id_finca) | (Solicitud.id_finca_destino == id_finca)).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar la finca porque tiene bovinos o solicitudes asociadas")
    db.delete(finca)
    db.commit()
    return {"ok": True, "mensaje": "Finca eliminada correctamente"}


@router.get("/bovinos")
def listar_bovinos(db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    bovinos = db.query(Bovino).order_by(Bovino.id_bovino.desc()).all()
    return [_serializar_bovino(db, bovino) for bovino in bovinos]


@router.post("/bovinos")
def crear_bovino_admin(data: BovinoCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first()
    _require_campesino(usuario)
    if data.id_finca and not db.query(Finca).filter(Finca.id_finca == data.id_finca).first():
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    bovino = Bovino(**data.model_dump())
    db.add(bovino)
    db.commit()
    db.refresh(bovino)
    return _serializar_bovino(db, bovino)


@router.put("/bovinos/{id_bovino}")
def actualizar_bovino_admin(id_bovino: int, data: BovinoUpdate, db: Session = Depends(get_db)):
    bovino = db.query(Bovino).filter(Bovino.id_bovino == id_bovino).first()
    if not bovino:
        raise HTTPException(status_code=404, detail="Bovino no encontrado")
    cambios = data.model_dump(exclude_unset=True)
    if "id_usuario" in cambios and cambios["id_usuario"]:
        usuario = db.query(Usuario).filter(Usuario.id_usuario == cambios["id_usuario"]).first()
        _require_campesino(usuario)
    if "id_finca" in cambios and cambios["id_finca"] and not db.query(Finca).filter(Finca.id_finca == cambios["id_finca"]).first():
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    for key, value in cambios.items():
        setattr(bovino, key, value)
    db.commit()
    db.refresh(bovino)
    return _serializar_bovino(db, bovino)


@router.delete("/bovinos/{id_bovino}")
def eliminar_bovino_admin(id_bovino: int, db: Session = Depends(get_db)):
    bovino = db.query(Bovino).filter(Bovino.id_bovino == id_bovino).first()
    if not bovino:
        raise HTTPException(status_code=404, detail="Bovino no encontrado")
    if db.query(SolicitudBovino).filter(SolicitudBovino.bovino_id == id_bovino).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar el bovino porque está asociado a solicitudes registradas")
    for documento in db.query(DocumentacionBovino).filter(DocumentacionBovino.id_bovino == id_bovino).all():
        db.delete(documento)
    db.delete(bovino)
    db.commit()
    return {"ok": True, "mensaje": "Bovino eliminado correctamente"}


@router.get("/vehiculos")
def listar_vehiculos(db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    vehiculos = db.query(Vehiculo).order_by(Vehiculo.id_vehiculo.desc()).all()
    return [_serializar_vehiculo(db, vehiculo) for vehiculo in vehiculos]


@router.post("/vehiculos")
def crear_vehiculo_admin(data: VehiculoCreate, db: Session = Depends(get_db)):
    if not db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first():
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    try:
        tipo_normalizado, _ = validate_vehicle_ranges(data.tipo_vehiculo, float(data.peso_max_prom), int(data.capacidad_bovinos))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    vehiculo = Vehiculo(
        id_usuario=data.id_usuario,
        tipo_vehiculo=tipo_normalizado,
        marca=data.marca.strip(),
        modelo=int(data.modelo),
        peso_max_prom=float(data.peso_max_prom),
        capacidad_bovinos=int(data.capacidad_bovinos),
        descripcion=(data.descripcion or "").strip(),
        placa=(data.placa or "").strip().upper(),
    )
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return _serializar_vehiculo(db, vehiculo)


@router.put("/vehiculos/{id_vehiculo}")
def actualizar_vehiculo_admin(id_vehiculo: int, data: VehiculoCreate, db: Session = Depends(get_db)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == id_vehiculo).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if not db.query(Usuario).filter(Usuario.id_usuario == data.id_usuario).first():
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    try:
        tipo_normalizado, _ = validate_vehicle_ranges(data.tipo_vehiculo, float(data.peso_max_prom), int(data.capacidad_bovinos))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    vehiculo.id_usuario = data.id_usuario
    vehiculo.tipo_vehiculo = tipo_normalizado
    vehiculo.marca = data.marca.strip()
    vehiculo.modelo = int(data.modelo)
    vehiculo.peso_max_prom = float(data.peso_max_prom)
    vehiculo.capacidad_bovinos = int(data.capacidad_bovinos)
    vehiculo.descripcion = (data.descripcion or "").strip()
    vehiculo.placa = (data.placa or "").strip().upper()
    db.commit()
    db.refresh(vehiculo)
    return _serializar_vehiculo(db, vehiculo)


@router.delete("/vehiculos/{id_vehiculo}")
def eliminar_vehiculo_admin(id_vehiculo: int, db: Session = Depends(get_db)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == id_vehiculo).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    if db.query(Viaje).filter(Viaje.id_vehiculo == id_vehiculo).first() or db.query(Solicitud).filter(Solicitud.id_vehiculo == id_vehiculo).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar el vehículo porque está asociado a viajes o solicitudes")
    for documento in db.query(DocumentacionVehiculo).filter(DocumentacionVehiculo.id_vehiculo == id_vehiculo).all():
        db.delete(documento)
    db.delete(vehiculo)
    db.commit()
    return {"ok": True, "mensaje": "Vehículo eliminado correctamente"}


@router.get("/solicitudes")
def listar_solicitudes(db: Session = Depends(get_db)):
    solicitudes = db.query(Solicitud).order_by(Solicitud.id.desc()).all()
    return [_serializar_solicitud(db, solicitud) for solicitud in solicitudes]


@router.get("/viajes")
def listar_viajes(db: Session = Depends(get_db)):
    viajes = db.query(Viaje).order_by(Viaje.id.desc()).all()
    return [_serializar_viaje(db, viaje) for viaje in viajes]

@router.patch("/viajes/{id_viaje}/estado")
def actualizar_estado_viaje_admin(id_viaje: int, payload: EstadoViajeAdminPayload, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    viaje = db.query(Viaje).filter(Viaje.id == id_viaje).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if payload.estado not in ESTADOS_VIAJE:
        raise HTTPException(status_code=400, detail="Estado de viaje no válido")
    estado_actual = ORDEN_ESTADOS_VIAJE.get(viaje.estado, -1)
    nuevo_estado = ORDEN_ESTADOS_VIAJE.get(payload.estado, -1)
    if nuevo_estado < estado_actual:
        raise HTTPException(status_code=400, detail="No puedes devolver el viaje a un estado anterior")
    viaje.estado = payload.estado
    db.add(viaje)
    solicitud = db.query(Solicitud).filter(Solicitud.id == viaje.solicitud_id).first() if viaje.solicitud_id else None
    if solicitud:
        solicitud.estado = payload.estado
        db.add(solicitud)
    db.commit()
    db.refresh(viaje)
    return {"ok": True, "mensaje": "Estado del viaje actualizado correctamente", "estado": viaje.estado, "progreso": _calcular_progreso(viaje.estado)}
