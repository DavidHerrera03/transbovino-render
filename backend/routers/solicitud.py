from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session, aliased

from database import get_db
from models.bovino import Bovino
from models.finca import Finca
from models.solicitud import Solicitud, SolicitudBovino, SolicitudOferta, SolicitudRechazo
from models.usuario import Usuario
from models.vehiculo import Vehiculo
from schemas.solicitud import OfertaCampesinoPayload
from utils.db_schema import ensure_operational_schema
from utils.tarifas import calcular_tarifa_minima, normalizar_vereda, vereda_permitida
from utils.validators import normalize_optional_phone
from utils.firebase_storage import (
    build_solicitud_document_path,
    generate_private_file_url,
    is_firebase_storage_configured,
    upload_private_file,
)

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])

TIPOS_AUTOMATICOS = {
    "Venta a frigorifico": {
        "nombre": "Frigorífico EFZ",
        "vereda": "Zipaquira",
        "referencia": "Av. Industrial Km. 1 vía Zipaquirá – Bogotá",
    },
    "Feria ganadera": {
        "nombre": "Plaza de Ferias de Zipaquirá",
        "vereda": "Zipaquira",
        "referencia": "Av. Industrial Km. 1 vía Zipaquirá – Bogotá",
    },
}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
ESTADOS_BOVINO_OCUPADO = {"Buscando conductor", "Asignado", "En ruta"}


def construir_resumen_bovinos_por_solicitud(db: Session, solicitud_ids: list[int]):
    if not solicitud_ids:
        return {}

    filas = (
        db.query(
            SolicitudBovino.solicitud_id,
            Bovino.id_bovino,
            Bovino.codigo_bovino,
            Bovino.raza,
            Bovino.peso_promedio,
            Bovino.edad,
            Bovino.observaciones,
            Finca.nombre_finca.label('nombre_finca'),
            Finca.municipio.label('municipio_finca'),
            Finca.vereda.label('vereda_finca'),
        )
        .join(Bovino, Bovino.id_bovino == SolicitudBovino.bovino_id)
        .outerjoin(Finca, Finca.id_finca == Bovino.id_finca)
        .filter(SolicitudBovino.solicitud_id.in_(solicitud_ids))
        .order_by(SolicitudBovino.solicitud_id.asc(), Bovino.id_bovino.asc())
        .all()
    )

    resumen = {}
    for fila in filas:
        resumen.setdefault(fila.solicitud_id, []).append({
            'id_bovino': fila.id_bovino,
            'codigo_bovino': fila.codigo_bovino,
            'raza': fila.raza,
            'peso_promedio': fila.peso_promedio,
            'edad': fila.edad,
            'observaciones': fila.observaciones,
            'nombre_finca': fila.nombre_finca,
            'municipio_finca': fila.municipio_finca,
            'vereda_finca': fila.vereda_finca,
        })
    return resumen


def validar_campesino(db: Session, id_usuario: int) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.rol != "campesino":
        raise HTTPException(status_code=403, detail="Solo los campesinos pueden gestionar solicitudes")
    return usuario


def _parse_bool(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "si", "sí", "yes"}


def _validate_upload(file: UploadFile | None, label: str, *, required: bool = False):
    if required and file is None:
        raise HTTPException(status_code=400, detail=f"Debes adjuntar la {label}")
    if file is None:
        return None

    nombre = (file.filename or "").strip()
    extension = Path(nombre).suffix.lower()
    if not nombre:
        raise HTTPException(status_code=400, detail=f"El archivo de {label} no es válido")
    if extension not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"La {label} debe ser PDF, JPG, JPEG o PNG")
    return nombre, extension


def _doc_links(path: str | None, filename: str | None = None):
    if not path or path == "pendiente":
        return {"view": None, "download": None}
    if path.startswith("gs://"):
        try:
            return {
                "view": generate_private_file_url(path),
                "download": generate_private_file_url(path, download=True, download_name=filename),
            }
        except Exception:
            return {"view": None, "download": None}
    return {"view": path, "download": path}


def _serializar_oferta(oferta: SolicitudOferta, transportador: Usuario | None = None):
    return {
        'id': oferta.id,
        'solicitud_id': oferta.solicitud_id,
        'transportador_id': oferta.transportador_id,
        'transportador_nombre': f"{transportador.nombre} {transportador.apellido}".strip() if transportador else None,
        'valor_oferta': float(oferta.valor_oferta or 0),
        'estado': oferta.estado,
        'propuesta_por': oferta.propuesta_por,
        'created_at': oferta.created_at.isoformat() if oferta.created_at else None,
        'updated_at': oferta.updated_at.isoformat() if oferta.updated_at else None,
    }


def _ofertas_por_solicitud(db: Session, solicitud_ids: list[int]):
    if not solicitud_ids:
        return {}
    filas = (
        db.query(SolicitudOferta, Usuario)
        .join(Usuario, Usuario.id_usuario == SolicitudOferta.transportador_id)
        .filter(SolicitudOferta.solicitud_id.in_(solicitud_ids))
        .order_by(SolicitudOferta.updated_at.desc())
        .all()
    )
    data = {}
    for oferta, transportador in filas:
        data.setdefault(oferta.solicitud_id, []).append(_serializar_oferta(oferta, transportador))
    return data


def _bovinos_ocupados_ids(db: Session, bovino_ids: list[int]) -> set[int]:
    if not bovino_ids:
        return set()
    rows = (
        db.query(distinct(SolicitudBovino.bovino_id))
        .join(Solicitud, Solicitud.id == SolicitudBovino.solicitud_id)
        .filter(
            SolicitudBovino.bovino_id.in_(bovino_ids),
            Solicitud.estado.in_(ESTADOS_BOVINO_OCUPADO),
        )
        .all()
    )
    return {int(row[0]) for row in rows}


@router.post("/")
async def crear_solicitud(
    id_usuario: int = Form(...),
    tipo_solicitud: str = Form(...),
    origen: str = Form(...),
    destino: str = Form(...),
    fecha: str | None = Form(None),
    hora_recogida: str | None = Form(None),
    contacto_entrega: str | None = Form(None),
    telefono_contacto: str | None = Form(None),
    observaciones: str | None = Form(None),
    observaciones_ganado: str | None = Form(None),
    bovino_ids: list[int] = Form(...),
    id_finca_origen: int | None = Form(None),
    id_finca_destino: int | None = Form(None),
    destino_confirmado: str | None = Form(None),
    destino_rechazado: str | None = Form(None),
    vereda_origen: str | None = Form(None),
    vereda_destino: str | None = Form(None),
    valor_referencia_campesino: float = Form(...),
    guia_movilidad: UploadFile | None = File(None),
    documento_adicional: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_campesino(db, id_usuario)
    try:
        telefono_contacto = normalize_optional_phone(telefono_contacto)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    _validate_upload(guia_movilidad, "guía de movilidad", required=False)
    _validate_upload(documento_adicional, "documento adicional", required=False)

    if (guia_movilidad is not None or documento_adicional is not None) and not is_firebase_storage_configured():
        raise HTTPException(status_code=500, detail="Firebase Storage no está configurado correctamente en el backend")

    bovino_ids_list = list({int(bovino_id) for bovino_id in bovino_ids})
    if not bovino_ids_list:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un bovino")

    bovinos = db.query(Bovino).filter(
        Bovino.id_usuario == id_usuario,
        Bovino.estado == 'activo',
        Bovino.id_bovino.in_(bovino_ids_list),
    ).all()
    if len(bovinos) != len(bovino_ids_list):
        raise HTTPException(status_code=400, detail="Uno o más bovinos no pertenecen al usuario")

    ocupados = _bovinos_ocupados_ids(db, bovino_ids_list)
    if ocupados:
        bovino_ocupado = next((b for b in bovinos if b.id_bovino in ocupados), None)
        codigo = bovino_ocupado.codigo_bovino if bovino_ocupado else None
        raise HTTPException(status_code=400, detail=f"El bovino {codigo or ''} ya está en un viaje y no se puede seleccionar nuevamente.".strip())

    finca_origen = None
    finca_destino = None
    destino_es_tercero = False
    accion_bovino = None

    if id_finca_origen:
        finca_origen = db.query(Finca).filter(Finca.id_finca == id_finca_origen, Finca.id_usuario == id_usuario).first()
        if not finca_origen:
            raise HTTPException(status_code=400, detail='La finca de origen no es válida para este usuario')
        if any(int(b.id_finca or 0) != finca_origen.id_finca for b in bovinos):
            raise HTTPException(status_code=400, detail='Todos los bovinos seleccionados deben pertenecer a la finca de origen elegida')

    if id_finca_destino:
        finca_destino = db.query(Finca).filter(Finca.id_finca == id_finca_destino).first()
        if not finca_destino:
            raise HTTPException(status_code=400, detail='La finca de destino no existe')
        destino_es_tercero = finca_destino.id_usuario != id_usuario

    if tipo_solicitud == 'Traslado de finca a finca':
        if not id_finca_origen or not id_finca_destino:
            raise HTTPException(status_code=400, detail='Debes seleccionar finca de origen y finca de destino')
        if id_finca_origen == id_finca_destino:
            raise HTTPException(status_code=400, detail='Debes elegir una finca de destino diferente a la finca actual')
        if finca_destino.id_usuario != id_usuario:
            raise HTTPException(status_code=400, detail='La finca destino debe pertenecer al mismo usuario')
        accion_bovino = 'trasladar'
    elif tipo_solicitud == 'Venta':
        if destino_es_tercero and _parse_bool(destino_confirmado):
            accion_bovino = 'transferir'
        elif _parse_bool(destino_rechazado):
            accion_bovino = 'inactivo'
        else:
            accion_bovino = 'vendido'
    elif tipo_solicitud in TIPOS_AUTOMATICOS:
        accion_bovino = 'frigorifico'
    else:
        accion_bovino = 'feria'

    if not vereda_origen and finca_origen:
        vereda_origen = finca_origen.vereda
    if not vereda_destino:
        vereda_destino = finca_destino.vereda if finca_destino else TIPOS_AUTOMATICOS.get(tipo_solicitud, {}).get('vereda')

    if not vereda_permitida(vereda_origen) or not vereda_permitida(vereda_destino):
        raise HTTPException(status_code=400, detail='La vereda de origen o destino no está permitida por la plataforma')

    tarifa = calcular_tarifa_minima(vereda_origen, vereda_destino)
    valor_referencia_campesino = float(valor_referencia_campesino or 0)
    if valor_referencia_campesino < float(tarifa['tarifa_minima']):
        raise HTTPException(status_code=400, detail=f"La oferta inicial no puede ser menor a ${int(tarifa['tarifa_minima']):,} para esta ruta".replace(',', '.'))

    nueva = Solicitud(
        codigo=None,
        tipo_solicitud=tipo_solicitud,
        origen=origen,
        destino=destino,
        fecha=fecha,
        hora_recogida=hora_recogida,
        contacto_entrega=contacto_entrega,
        telefono_contacto=telefono_contacto,
        estado='Negociando pago',
        observaciones=observaciones,
        observaciones_ganado=observaciones_ganado,
        guia_movilidad_nombre='pendiente',
        guia_movilidad_ruta='pendiente',
        id_usuario=id_usuario,
        id_transportador=None,
        id_vehiculo=None,
        id_finca_origen=id_finca_origen,
        id_finca_destino=id_finca_destino,
        destino_confirmado=_parse_bool(destino_confirmado),
        destino_rechazado=_parse_bool(destino_rechazado),
        destino_es_tercero=bool(destino_es_tercero),
        accion_bovino=accion_bovino,
        vereda_origen=normalizar_vereda(vereda_origen),
        vereda_destino=normalizar_vereda(vereda_destino),
        distancia_km=tarifa['distancia_km'],
        tarifa_minima=tarifa['tarifa_minima'],
        valor_referencia_campesino=valor_referencia_campesino,
    )
    db.add(nueva)
    db.flush()

    try:
        if guia_movilidad is not None and guia_movilidad.filename:
            guia_nombre = (guia_movilidad.filename or 'guia.pdf').strip()
            guia_ext = Path(guia_nombre).suffix.lower()
            guia_bytes = await guia_movilidad.read()
            if len(guia_bytes) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail='La guía de movilidad supera el máximo permitido de 5MB')
            guia_path = build_solicitud_document_path(id_usuario, nueva.id, 'guia-movilidad', f'{uuid4().hex}{guia_ext}')
            nueva.guia_movilidad_nombre = guia_nombre
            nueva.guia_movilidad_ruta = upload_private_file(guia_path, guia_bytes, guia_nombre)

        if documento_adicional is not None and documento_adicional.filename:
            adicional_nombre = (documento_adicional.filename or 'documento').strip()
            adicional_ext = Path(adicional_nombre).suffix.lower()
            adicional_bytes = await documento_adicional.read()
            if len(adicional_bytes) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail='El documento adicional supera el máximo permitido de 5MB')
            adicional_path = build_solicitud_document_path(id_usuario, nueva.id, 'informacion-adicional', f'{uuid4().hex}{adicional_ext}')
            nueva.info_adicional_nombre = adicional_nombre
            nueva.info_adicional_ruta = upload_private_file(adicional_path, adicional_bytes, adicional_nombre)
    except Exception:
        db.rollback()
        raise

    nueva.codigo = f"SOL-{str(nueva.id).zfill(3)}"
    db.add(nueva)
    for bovino_id in bovino_ids_list:
        db.add(SolicitudBovino(solicitud_id=nueva.id, bovino_id=bovino_id))

    db.commit()
    db.refresh(nueva)

    return {
        'ok': True,
        'id': nueva.id,
        'codigo': nueva.codigo,
        'estado': nueva.estado,
        'distancia_km': nueva.distancia_km,
        'tarifa_minima': nueva.tarifa_minima,
        'valor_referencia_campesino': nueva.valor_referencia_campesino,
        'guia_movilidad_nombre': nueva.guia_movilidad_nombre,
        'puede_cancelar': True,
        'accion_bovino': accion_bovino,
        'destino_es_tercero': destino_es_tercero,
    }



@router.patch('/{solicitud_id}/documentos')
async def cargar_documentos_solicitud(
    solicitud_id: int,
    id_usuario: int = Form(...),
    guia_movilidad: UploadFile = File(...),
    documento_adicional: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_campesino(db, id_usuario)
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail='Solicitud no encontrada')
    if solicitud.id_usuario != id_usuario:
        raise HTTPException(status_code=403, detail='No puedes cargar documentos en una solicitud de otro usuario')
    if not solicitud.id_transportador or not solicitud.id_vehiculo or solicitud.estado not in {'Asignado', 'En ruta'}:
        raise HTTPException(status_code=400, detail='Solo puedes cargar la guía cuando ya exista un acuerdo y el transportador haya asignado un vehículo')

    _validate_upload(guia_movilidad, 'guía de movilidad', required=True)
    _validate_upload(documento_adicional, 'documento adicional', required=False)

    if not is_firebase_storage_configured():
        raise HTTPException(status_code=500, detail='Firebase Storage no está configurado correctamente en el backend')

    try:
        guia_nombre = (guia_movilidad.filename or 'guia.pdf').strip()
        guia_ext = Path(guia_nombre).suffix.lower()
        guia_bytes = await guia_movilidad.read()
        if len(guia_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail='La guía de movilidad supera el máximo permitido de 5MB')
        guia_path = build_solicitud_document_path(id_usuario, solicitud.id, 'guia-movilidad', f'{uuid4().hex}{guia_ext}')
        solicitud.guia_movilidad_nombre = guia_nombre
        solicitud.guia_movilidad_ruta = upload_private_file(guia_path, guia_bytes, guia_nombre)

        if documento_adicional is not None and documento_adicional.filename:
            adicional_nombre = (documento_adicional.filename or 'documento').strip()
            adicional_ext = Path(adicional_nombre).suffix.lower()
            adicional_bytes = await documento_adicional.read()
            if len(adicional_bytes) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail='El documento adicional supera el máximo permitido de 5MB')
            adicional_path = build_solicitud_document_path(id_usuario, solicitud.id, 'informacion-adicional', f'{uuid4().hex}{adicional_ext}')
            solicitud.info_adicional_nombre = adicional_nombre
            solicitud.info_adicional_ruta = upload_private_file(adicional_path, adicional_bytes, adicional_nombre)

        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
    except Exception:
        db.rollback()
        raise

    return {
        'ok': True,
        'mensaje': 'Documentos cargados correctamente',
        'guia_movilidad_nombre': solicitud.guia_movilidad_nombre,
        'guia_movilidad_url': _doc_links(solicitud.guia_movilidad_ruta, solicitud.guia_movilidad_nombre)['view'],
        'info_adicional_nombre': solicitud.info_adicional_nombre,
        'info_adicional_url': _doc_links(solicitud.info_adicional_ruta, solicitud.info_adicional_nombre)['view'],
    }
@router.get('/usuario/{id_usuario}')
def listar_solicitudes_usuario(id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    validar_campesino(db, id_usuario)
    transportador = aliased(Usuario)
    finca_origen = aliased(Finca)
    finca_destino = aliased(Finca)

    resultados = (
        db.query(
            Solicitud.id,
            Solicitud.codigo,
            Solicitud.tipo_solicitud,
            Solicitud.origen,
            Solicitud.destino,
            Solicitud.fecha,
            Solicitud.hora_recogida,
            Solicitud.contacto_entrega,
            Solicitud.telefono_contacto,
            Solicitud.estado,
            Solicitud.id_transportador,
            Solicitud.id_vehiculo,
            Solicitud.observaciones,
            Solicitud.observaciones_ganado,
            Solicitud.id_finca_origen,
            Solicitud.id_finca_destino,
            Solicitud.guia_movilidad_nombre,
            Solicitud.guia_movilidad_ruta,
            Solicitud.info_adicional_nombre,
            Solicitud.info_adicional_ruta,
            Solicitud.vereda_origen,
            Solicitud.vereda_destino,
            Solicitud.distancia_km,
            Solicitud.tarifa_minima,
            Solicitud.valor_referencia_campesino,
            func.count(func.distinct(SolicitudBovino.id)).label('cantidad_bovinos'),
            transportador.nombre.label('transportador_nombre'),
            transportador.apellido.label('transportador_apellido'),
            Vehiculo.placa.label('vehiculo_placa'),
            Vehiculo.modelo.label('vehiculo_modelo'),
            Vehiculo.marca.label('vehiculo_marca'),
            Vehiculo.tipo_vehiculo.label('vehiculo_tipo'),
            finca_origen.nombre_finca.label('finca_origen_nombre'),
            finca_destino.nombre_finca.label('finca_destino_nombre'),
        )
        .outerjoin(SolicitudBovino, SolicitudBovino.solicitud_id == Solicitud.id)
        .outerjoin(transportador, transportador.id_usuario == Solicitud.id_transportador)
        .outerjoin(Vehiculo, Vehiculo.id_vehiculo == Solicitud.id_vehiculo)
        .outerjoin(finca_origen, finca_origen.id_finca == Solicitud.id_finca_origen)
        .outerjoin(finca_destino, finca_destino.id_finca == Solicitud.id_finca_destino)
        .filter(Solicitud.id_usuario == id_usuario)
        .group_by(
            Solicitud.id, Solicitud.codigo, Solicitud.tipo_solicitud, Solicitud.origen, Solicitud.destino,
            Solicitud.fecha, Solicitud.hora_recogida, Solicitud.contacto_entrega, Solicitud.telefono_contacto,
            Solicitud.estado, Solicitud.id_transportador, Solicitud.id_vehiculo, Solicitud.observaciones,
            Solicitud.observaciones_ganado, Solicitud.id_finca_origen, Solicitud.id_finca_destino,
            Solicitud.guia_movilidad_nombre, Solicitud.guia_movilidad_ruta,
            Solicitud.info_adicional_nombre, Solicitud.info_adicional_ruta,
            Solicitud.vereda_origen, Solicitud.vereda_destino, Solicitud.distancia_km, Solicitud.tarifa_minima, Solicitud.valor_referencia_campesino,
            transportador.nombre, transportador.apellido, Vehiculo.placa, Vehiculo.modelo, Vehiculo.marca,
            Vehiculo.tipo_vehiculo, finca_origen.nombre_finca, finca_destino.nombre_finca,
        )
        .order_by(Solicitud.id.desc())
        .all()
    )

    resumen_bovinos = construir_resumen_bovinos_por_solicitud(db, [item.id for item in resultados])
    ofertas_por_solicitud = _ofertas_por_solicitud(db, [item.id for item in resultados])

    return [
        {
            'id': item.id,
            'codigo': item.codigo,
            'tipo_solicitud': item.tipo_solicitud,
            'origen': item.origen,
            'destino': item.destino,
            'fecha': item.fecha,
            'hora_recogida': item.hora_recogida,
            'contacto_entrega': item.contacto_entrega,
            'telefono_contacto': item.telefono_contacto,
            'estado': item.estado,
            'cantidad_bovinos': int(item.cantidad_bovinos or 0),
            'observaciones': item.observaciones,
            'observaciones_ganado': item.observaciones_ganado,
            'id_transportador': item.id_transportador,
            'transportador_nombre': (f"{item.transportador_nombre or ''} {item.transportador_apellido or ''}".strip() or None),
            'vehiculo_id': item.id_vehiculo,
            'vehiculo_placa': item.vehiculo_placa,
            'vehiculo_modelo': item.vehiculo_modelo,
            'vehiculo_marca': item.vehiculo_marca,
            'vehiculo_tipo': item.vehiculo_tipo,
            'finca_origen_nombre': item.finca_origen_nombre,
            'finca_destino_nombre': item.finca_destino_nombre,
            'vereda_origen': item.vereda_origen,
            'vereda_destino': item.vereda_destino,
            'distancia_km': float(item.distancia_km or 0),
            'tarifa_minima': float(item.tarifa_minima or 0),
            'valor_referencia_campesino': float(item.valor_referencia_campesino or 0),
            'guia_movilidad_nombre': item.guia_movilidad_nombre,
            'guia_movilidad_url': _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)['view'],
            'guia_movilidad_download_url': _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)['download'],
            'info_adicional_nombre': item.info_adicional_nombre,
            'info_adicional_url': _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)['view'],
            'info_adicional_download_url': _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)['download'],
            'puede_cancelar': item.id_transportador is None and item.estado in {'Buscando conductor', 'Negociando pago'},
            'bovinos': resumen_bovinos.get(item.id, []),
            'ofertas_pago': ofertas_por_solicitud.get(item.id, []),
        }
        for item in resultados
    ]


@router.patch('/{solicitud_id}/ofertas/campesino')
def gestionar_oferta_campesino(solicitud_id: int, payload: OfertaCampesinoPayload, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    validar_campesino(db, payload.id_usuario)
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail='Solicitud no encontrada')
    if solicitud.id_usuario != payload.id_usuario:
        raise HTTPException(status_code=403, detail='No puedes gestionar ofertas de otra solicitud')
    oferta = db.query(SolicitudOferta).filter(SolicitudOferta.solicitud_id == solicitud_id, SolicitudOferta.transportador_id == payload.transportador_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail='No existe una oferta activa para ese transportador')

    if payload.accion == 'rechazar':
        oferta.estado = 'rechazada_campesino'
        db.add(oferta)
        rechazo = db.query(SolicitudRechazo).filter(SolicitudRechazo.solicitud_id == solicitud_id, SolicitudRechazo.transportador_id == payload.transportador_id).first()
        if not rechazo:
            db.add(SolicitudRechazo(solicitud_id=solicitud_id, transportador_id=payload.transportador_id))
    elif payload.accion == 'aceptar':
        oferta.estado = 'acordado'
        oferta.propuesta_por = 'campesino'
        db.add(oferta)
    else:
        if payload.valor_oferta is None:
            raise HTTPException(status_code=400, detail='Debes enviar la contraoferta del campesino')
        if float(payload.valor_oferta) < float(solicitud.tarifa_minima or 0):
            raise HTTPException(status_code=400, detail='La contraoferta no puede ser menor a la tarifa mínima permitida')
        oferta.valor_oferta = float(payload.valor_oferta)
        oferta.estado = 'pendiente_transportador'
        oferta.propuesta_por = 'campesino'
        db.add(oferta)

    db.commit()
    transportador = db.query(Usuario).filter(Usuario.id_usuario == payload.transportador_id).first()
    return {'ok': True, 'oferta': _serializar_oferta(oferta, transportador)}


@router.get('/{solicitud_id}/ofertas')
def listar_ofertas_solicitud(solicitud_id: int, id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail='Solicitud no encontrada')
    if solicitud.id_usuario != id_usuario:
        raise HTTPException(status_code=403, detail='No puedes consultar ofertas de otra solicitud')
    return _ofertas_por_solicitud(db, [solicitud_id]).get(solicitud_id, [])


@router.patch('/{solicitud_id}/cancelar')
def cancelar_solicitud(solicitud_id: int, payload: dict, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    id_usuario = int(payload.get('id_usuario') or 0)
    validar_campesino(db, id_usuario)
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail='Solicitud no encontrada')
    if solicitud.id_usuario != id_usuario:
        raise HTTPException(status_code=403, detail='No puedes cancelar una solicitud de otro usuario')
    if solicitud.id_transportador is not None:
        raise HTTPException(status_code=400, detail='La solicitud ya fue confirmada con un transportador y no se puede cancelar')
    if solicitud.estado not in {'Buscando conductor', 'Negociando pago'}:
        raise HTTPException(status_code=400, detail='La solicitud ya no se puede cancelar en su estado actual')

    solicitud.estado = 'Cancelada'
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return {'ok': True, 'mensaje': 'Solicitud cancelada correctamente', 'estado': solicitud.estado}
