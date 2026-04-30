from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, aliased

from database import get_db
from models.bovino import Bovino
from models.bovino_movimiento import BovinoMovimiento
from models.finca import Finca
from models.solicitud import Solicitud, SolicitudBovino, SolicitudOferta, SolicitudRechazo
from models.usuario import Usuario
from models.vehiculo import Vehiculo
from models.viaje import Viaje
from schemas.solicitud import CambiarEstadoViajePayload, OfertaTransportadorPayload, SolicitudTransportadorAction
from utils.db_schema import ensure_operational_schema
from utils.firebase_storage import generate_private_file_url

router = APIRouter(prefix="/transportador", tags=["Transportador"])

ESTADOS_VIAJE = {"Asignado", "En ruta", "Completado"}
ESTADOS_VEHICULO_OCUPADO = {"Asignado", "En ruta"}
ORDEN_ESTADOS_VIAJE = {"Asignado": 0, "En ruta": 1, "Completado": 2}


def validar_transportador(db: Session, id_usuario: int) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Transportador no encontrado")
    if usuario.rol != "transportador":
        raise HTTPException(status_code=403, detail="Solo los transportadores pueden realizar esta acción")
    return usuario


def validar_vehiculo_transportador(db: Session, id_transportador: int, id_vehiculo: int | None) -> Vehiculo:
    if not id_vehiculo:
        raise HTTPException(status_code=400, detail="Debes seleccionar un vehículo para aceptar la solicitud")

    vehiculo = (
        db.query(Vehiculo)
        .filter(Vehiculo.id_vehiculo == id_vehiculo, Vehiculo.id_usuario == id_transportador)
        .first()
    )
    if not vehiculo:
        raise HTTPException(status_code=404, detail="El vehículo seleccionado no pertenece al transportador")

    viaje_activo = (
        db.query(Viaje.id)
        .filter(Viaje.id_vehiculo == id_vehiculo, Viaje.estado.in_(ESTADOS_VEHICULO_OCUPADO))
        .first()
    )
    if viaje_activo:
        raise HTTPException(
            status_code=400,
            detail="El vehículo seleccionado todavía no ha completado al 100% otro viaje y no puede tomar una nueva solicitud.",
        )

    return vehiculo


def validar_capacidad_para_solicitud(db: Session, solicitud_id: int, vehiculo: Vehiculo):
    resumen = (
        db.query(
            func.count(SolicitudBovino.id).label("cantidad_bovinos"),
            func.coalesce(func.sum(Bovino.peso_promedio), 0).label("peso_total_bovinos"),
        )
        .join(Bovino, Bovino.id_bovino == SolicitudBovino.bovino_id)
        .filter(SolicitudBovino.solicitud_id == solicitud_id)
        .first()
    )

    cantidad_bovinos = int(resumen.cantidad_bovinos or 0)
    peso_total_bovinos = float(resumen.peso_total_bovinos or 0)

    if cantidad_bovinos == 0:
        raise HTTPException(status_code=400, detail="La solicitud no tiene bovinos asociados")

    if cantidad_bovinos > int(vehiculo.capacidad_bovinos):
        raise HTTPException(
            status_code=400,
            detail=f"El vehículo {vehiculo.placa} solo permite {vehiculo.capacidad_bovinos} bovinos y la solicitud requiere {cantidad_bovinos}.",
        )

    if peso_total_bovinos > float(vehiculo.peso_max_prom):
        raise HTTPException(
            status_code=400,
            detail=f"El vehículo {vehiculo.placa} soporta hasta {vehiculo.peso_max_prom} kg y la solicitud requiere aproximadamente {round(peso_total_bovinos, 2)} kg.",
        )


def calcular_progreso(estado: Optional[str]) -> int:
    return {"Asignado": 33, "En ruta": 66, "Completado": 100}.get(estado, 0)


def obtener_oferta_transportador(db: Session, solicitud_id: int, transportador_id: int):
    return (
        db.query(SolicitudOferta)
        .filter(SolicitudOferta.solicitud_id == solicitud_id, SolicitudOferta.transportador_id == transportador_id)
        .first()
    )


def _doc_links(path: Optional[str], filename: Optional[str] = None) -> dict:
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



def registrar_movimiento(
    db: Session,
    *,
    bovino: Bovino,
    solicitud: Solicitud,
    tipo_movimiento: str,
    id_usuario_origen: int | None,
    id_usuario_destino: int | None,
    id_finca_origen: int | None,
    id_finca_destino: int | None,
    observacion: str,
):
    db.add(
        BovinoMovimiento(
            id_bovino=bovino.id_bovino,
            tipo_movimiento=tipo_movimiento,
            id_usuario_origen=id_usuario_origen,
            id_usuario_destino=id_usuario_destino,
            id_finca_origen=id_finca_origen,
            id_finca_destino=id_finca_destino,
            solicitud_id=solicitud.id,
            observacion=observacion,
        )
    )


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
            Finca.nombre_finca.label("nombre_finca"),
            Finca.municipio.label("municipio_finca"),
            Finca.vereda.label("vereda_finca"),
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
            "id_bovino": fila.id_bovino,
            "codigo_bovino": fila.codigo_bovino,
            "raza": fila.raza,
            "peso_promedio": fila.peso_promedio,
            "edad": fila.edad,
            "observaciones": fila.observaciones,
            "nombre_finca": fila.nombre_finca,
            "municipio_finca": fila.municipio_finca,
            "vereda_finca": fila.vereda_finca,
        })
    return resumen


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


def obtener_codigo_bovino_unico_para_usuario(
    db: Session,
    *,
    id_usuario: int,
    codigo_preferido: int | None = None,
    exclude_id: int | None = None,
    codigos_reservados: set[int] | None = None,
) -> int:
    reservados = set(codigos_reservados or set())

    if codigo_preferido is not None:
        codigo_preferido = int(codigo_preferido)
        if (
            codigo_preferido not in reservados
            and not codigo_bovino_existe_en_usuario(
                db,
                codigo_bovino=codigo_preferido,
                id_usuario=id_usuario,
                exclude_id=exclude_id,
            )
        ):
            return codigo_preferido

    ultimo_codigo = (
        db.query(Bovino.codigo_bovino)
        .filter(Bovino.id_usuario == id_usuario, Bovino.codigo_bovino.isnot(None))
        .order_by(Bovino.codigo_bovino.desc())
        .first()
    )

    siguiente = int(ultimo_codigo[0]) + 1 if ultimo_codigo and ultimo_codigo[0] is not None else 1

    while (
        siguiente in reservados
        or codigo_bovino_existe_en_usuario(
            db,
            codigo_bovino=siguiente,
            id_usuario=id_usuario,
            exclude_id=exclude_id,
        )
    ):
        siguiente += 1

    return siguiente


def aplicar_reglas_finalizacion(db: Session, solicitud: Solicitud):
    bovinos = (
        db.query(Bovino)
        .join(SolicitudBovino, SolicitudBovino.bovino_id == Bovino.id_bovino)
        .filter(SolicitudBovino.solicitud_id == solicitud.id)
        .all()
    )
    if not bovinos:
        return

    finca_destino = None
    if solicitud.id_finca_destino:
        finca_destino = db.query(Finca).filter(Finca.id_finca == solicitud.id_finca_destino).first()

    codigos_reservados_destino = set()

    for bovino in bovinos:
        usuario_origen = bovino.id_usuario
        finca_origen = bovino.id_finca

        if solicitud.accion_bovino == "trasladar" and solicitud.id_finca_destino:
            bovino.id_finca = solicitud.id_finca_destino
            bovino.estado = "activo"

            registrar_movimiento(
                db,
                bovino=bovino,
                solicitud=solicitud,
                tipo_movimiento="traslado",
                id_usuario_origen=usuario_origen,
                id_usuario_destino=usuario_origen,
                id_finca_origen=finca_origen,
                id_finca_destino=solicitud.id_finca_destino,
                observacion="Traslado completado entre fincas del mismo usuario.",
            )
            db.add(bovino)
            continue

        if solicitud.accion_bovino == "transferir" and finca_destino:
            nuevo_codigo = obtener_codigo_bovino_unico_para_usuario(
                db,
                id_usuario=finca_destino.id_usuario,
                codigo_preferido=bovino.codigo_bovino,
                exclude_id=bovino.id_bovino,
                codigos_reservados=codigos_reservados_destino,
            )
            codigos_reservados_destino.add(nuevo_codigo)

            bovino.codigo_bovino = nuevo_codigo
            bovino.id_usuario = finca_destino.id_usuario
            bovino.id_finca = finca_destino.id_finca
            bovino.estado = "activo"

            registrar_movimiento(
                db,
                bovino=bovino,
                solicitud=solicitud,
                tipo_movimiento="venta",
                id_usuario_origen=usuario_origen,
                id_usuario_destino=finca_destino.id_usuario,
                id_finca_origen=finca_origen,
                id_finca_destino=finca_destino.id_finca,
                observacion="Venta completada con transferencia del bovino a la finca destino registrada.",
            )
            db.add(bovino)
            continue

        if solicitud.accion_bovino == "frigorifico":
            bovino.estado = "frigorifico"
            bovino.id_finca = None

            registrar_movimiento(
                db,
                bovino=bovino,
                solicitud=solicitud,
                tipo_movimiento="frigorifico",
                id_usuario_origen=usuario_origen,
                id_usuario_destino=None,
                id_finca_origen=finca_origen,
                id_finca_destino=None,
                observacion="Salida del inventario por ingreso a frigorífico.",
            )
            db.add(bovino)
            continue

        if solicitud.accion_bovino == "feria":
            bovino.estado = "feria"
            bovino.id_finca = None

            registrar_movimiento(
                db,
                bovino=bovino,
                solicitud=solicitud,
                tipo_movimiento="feria",
                id_usuario_origen=usuario_origen,
                id_usuario_destino=None,
                id_finca_origen=finca_origen,
                id_finca_destino=None,
                observacion="Salida del inventario por feria ganadera.",
            )
            db.add(bovino)
            continue

        bovino.estado = "vendido"
        bovino.id_finca = None

        registrar_movimiento(
            db,
            bovino=bovino,
            solicitud=solicitud,
            tipo_movimiento="venta",
            id_usuario_origen=usuario_origen,
            id_usuario_destino=None,
            id_finca_origen=finca_origen,
            id_finca_destino=None,
            observacion="Venta completada sin finca destino registrada en la plataforma.",
        )
        db.add(bovino)


@router.get("/{id_usuario}/solicitudes")
def listar_solicitudes_vigentes_transportador(id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    validar_transportador(db, id_usuario)
    campesino = aliased(Usuario)

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
            Solicitud.observaciones,
            Solicitud.observaciones_ganado,
            Solicitud.guia_movilidad_nombre,
            Solicitud.guia_movilidad_ruta,
            Solicitud.info_adicional_nombre,
            Solicitud.info_adicional_ruta,
            Solicitud.distancia_km,
            Solicitud.tarifa_minima,
            Solicitud.valor_referencia_campesino,
            func.count(func.distinct(SolicitudBovino.id)).label("cantidad_bovinos"),
            func.coalesce(func.sum(Bovino.peso_promedio), 0).label("peso_total_bovinos"),
            campesino.id_usuario.label("campesino_id"),
            campesino.nombre.label("campesino_nombre"),
            campesino.apellido.label("campesino_apellido"),
        )
        .outerjoin(SolicitudBovino, SolicitudBovino.solicitud_id == Solicitud.id)
        .outerjoin(Bovino, Bovino.id_bovino == SolicitudBovino.bovino_id)
        .join(campesino, campesino.id_usuario == Solicitud.id_usuario)
        .outerjoin(
            SolicitudRechazo,
            and_(SolicitudRechazo.solicitud_id == Solicitud.id, SolicitudRechazo.transportador_id == id_usuario),
        )
        .filter(
            Solicitud.estado.in_(["Negociando pago", "Buscando conductor"]),
            Solicitud.id_transportador.is_(None),
            SolicitudRechazo.id.is_(None),
        )
        .group_by(
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
            Solicitud.observaciones,
            Solicitud.observaciones_ganado,
            Solicitud.guia_movilidad_nombre,
            Solicitud.guia_movilidad_ruta,
            Solicitud.info_adicional_nombre,
            Solicitud.info_adicional_ruta,
            Solicitud.distancia_km,
            Solicitud.tarifa_minima,
            Solicitud.valor_referencia_campesino,
            campesino.id_usuario,
            campesino.nombre,
            campesino.apellido,
        )
        .order_by(Solicitud.id.desc())
        .all()
    )

    resumen_bovinos = construir_resumen_bovinos_por_solicitud(db, [item.id for item in resultados])

    return [
        {
            "id": item.id,
            "codigo": item.codigo,
            "tipo_solicitud": item.tipo_solicitud,
            "origen": item.origen,
            "destino": item.destino,
            "fecha": item.fecha,
            "hora_recogida": item.hora_recogida,
            "contacto_entrega": item.contacto_entrega,
            "telefono_contacto": item.telefono_contacto,
            "estado": item.estado,
            "observaciones": item.observaciones,
            "observaciones_ganado": item.observaciones_ganado,
            "cantidad_bovinos": int(item.cantidad_bovinos or 0),
            "peso_total_bovinos": float(item.peso_total_bovinos or 0),
            "distancia_km": float(item.distancia_km or 0),
            "tarifa_minima": float(item.tarifa_minima or 0),
            "valor_referencia_campesino": float(item.valor_referencia_campesino or 0),
            "oferta_pago": (lambda oferta: {"valor_oferta": float(oferta.valor_oferta), "estado": oferta.estado, "propuesta_por": oferta.propuesta_por} if oferta else None)(obtener_oferta_transportador(db, item.id, id_usuario)),
            "campesino_id": item.campesino_id,
            "campesino_nombre": f"{item.campesino_nombre} {item.campesino_apellido}".strip(),
            "guia_movilidad_nombre": item.guia_movilidad_nombre,
            "guia_movilidad_url": _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)["view"],
            "guia_movilidad_download_url": _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)["download"],
            "info_adicional_nombre": item.info_adicional_nombre,
            "info_adicional_url": _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)["view"],
            "info_adicional_download_url": _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)["download"],
            "bovinos": resumen_bovinos.get(item.id, []),
        }
        for item in resultados
    ]


@router.patch("/solicitudes/{solicitud_id}/oferta")
def proponer_oferta_transportador(
    solicitud_id: int,
    payload: OfertaTransportadorPayload,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_transportador(db, payload.id_transportador)

    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado not in {"Negociando pago", "Buscando conductor"} or solicitud.id_transportador is not None:
        raise HTTPException(status_code=400, detail="La solicitud ya no está disponible para negociar")
    if float(payload.valor_oferta) < float(solicitud.tarifa_minima or 0):
        raise HTTPException(status_code=400, detail="La oferta no puede ser menor a la tarifa mínima permitida")

    rechazo = (
        db.query(SolicitudRechazo)
        .filter(SolicitudRechazo.solicitud_id == solicitud_id, SolicitudRechazo.transportador_id == payload.id_transportador)
        .first()
    )
    if rechazo:
        raise HTTPException(status_code=400, detail="Ya no puedes ofertar en esta solicitud porque tu propuesta fue rechazada")

    oferta = obtener_oferta_transportador(db, solicitud_id, payload.id_transportador)
    if not oferta:
        oferta = SolicitudOferta(
            solicitud_id=solicitud_id,
            transportador_id=payload.id_transportador,
            valor_oferta=float(payload.valor_oferta),
            estado="pendiente_campesino",
            propuesta_por="transportador",
        )
    else:
        oferta.valor_oferta = float(payload.valor_oferta)
        oferta.estado = "pendiente_campesino"
        oferta.propuesta_por = "transportador"
    db.add(oferta)
    db.commit()
    return {
        "ok": True,
        "oferta": {
            "valor_oferta": float(oferta.valor_oferta),
            "estado": oferta.estado,
            "propuesta_por": oferta.propuesta_por,
        },
    }


@router.patch("/solicitudes/{solicitud_id}/aceptar")
def aceptar_solicitud_transportador(
    solicitud_id: int,
    payload: SolicitudTransportadorAction,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_transportador(db, payload.id_transportador)

    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.id_transportador is not None:
        raise HTTPException(status_code=400, detail="La solicitud ya no está disponible")

    oferta = obtener_oferta_transportador(db, solicitud.id, payload.id_transportador)
    if oferta and oferta.estado in {"rechazada_campesino", "rechazada_transportador"}:
        raise HTTPException(status_code=400, detail="La oferta ya no está disponible para aceptar")

    if not oferta:
        oferta = SolicitudOferta(
            solicitud_id=solicitud.id,
            transportador_id=payload.id_transportador,
            valor_oferta=float(solicitud.valor_referencia_campesino or solicitud.tarifa_minima or 0),
            estado="acordado",
            propuesta_por="campesino",
        )
    elif oferta.estado == "pendiente_transportador":
        oferta.estado = "acordado"
    elif oferta.estado != "acordado":
        raise HTTPException(status_code=400, detail="Solo puedes aceptar la oferta actual del campesino o un acuerdo ya confirmado")

    db.add(oferta)

    vehiculo = validar_vehiculo_transportador(db, payload.id_transportador, payload.id_vehiculo)
    validar_capacidad_para_solicitud(db, solicitud.id, vehiculo)

    solicitud.id_transportador = payload.id_transportador
    solicitud.estado = "Asignado"
    solicitud.id_vehiculo = vehiculo.id_vehiculo
    db.add(solicitud)

    viaje = db.query(Viaje).filter(Viaje.solicitud_id == solicitud.id).first()
    if not viaje:
        viaje = Viaje(
            solicitud_id=solicitud.id,
            id_transportador=payload.id_transportador,
            id_vehiculo=vehiculo.id_vehiculo,
            origen=solicitud.origen,
            destino=solicitud.destino,
            fecha=solicitud.fecha,
            estado="Asignado",
        )
        db.add(viaje)
    else:
        viaje.id_transportador = payload.id_transportador
        viaje.id_vehiculo = vehiculo.id_vehiculo
        viaje.origen = solicitud.origen
        viaje.destino = solicitud.destino
        viaje.fecha = solicitud.fecha
        viaje.estado = "Asignado"
        db.add(viaje)

    rechazo = (
        db.query(SolicitudRechazo)
        .filter(
            SolicitudRechazo.solicitud_id == solicitud.id,
            SolicitudRechazo.transportador_id == payload.id_transportador,
        )
        .first()
    )
    if rechazo:
        db.delete(rechazo)

    db.commit()
    db.refresh(viaje)

    return {
        "ok": True,
        "mensaje": "Solicitud aceptada correctamente",
        "solicitud_id": solicitud.id,
        "viaje_id": viaje.id,
        "vehiculo_id": vehiculo.id_vehiculo,
        "vehiculo_placa": vehiculo.placa,
        "estado": solicitud.estado,
    }


@router.patch("/solicitudes/{solicitud_id}/rechazar")
def rechazar_solicitud_transportador(
    solicitud_id: int,
    payload: SolicitudTransportadorAction,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_transportador(db, payload.id_transportador)

    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.id_transportador is not None:
        raise HTTPException(status_code=400, detail="La solicitud ya no está disponible")

    oferta = obtener_oferta_transportador(db, solicitud.id, payload.id_transportador)
    if not oferta or oferta.estado != "acordado":
        raise HTTPException(status_code=400, detail="La solicitud solo puede rechazarse cuando exista un acuerdo de pago con este transportador")

    rechazo_existente = (
        db.query(SolicitudRechazo)
        .filter(
            SolicitudRechazo.solicitud_id == solicitud_id,
            SolicitudRechazo.transportador_id == payload.id_transportador,
        )
        .first()
    )
    if rechazo_existente:
        return {"ok": True, "mensaje": "La solicitud ya había sido rechazada"}

    oferta.estado = "rechazada_transportador"
    oferta.propuesta_por = "transportador"
    db.add(oferta)
    db.add(SolicitudRechazo(solicitud_id=solicitud_id, transportador_id=payload.id_transportador))
    db.commit()
    return {"ok": True, "mensaje": "Solicitud rechazada correctamente"}


@router.get("/{id_usuario}/viajes")
def listar_viajes_transportador(
    id_usuario: int,
    estado: Optional[str] = None,
    fecha: Optional[str] = None,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_transportador(db, id_usuario)
    campesino = aliased(Usuario)

    # Importante: usamos OUTER JOIN para no perder viajes antiguos importados
    # desde XAMPP que pueden no tener todas las relaciones completas.
    query = (
        db.query(
            Viaje.id,
            Viaje.solicitud_id,
            Viaje.origen,
            Viaje.destino,
            Viaje.fecha,
            Viaje.estado,
            Solicitud.codigo.label("solicitud_codigo"),
            Solicitud.guia_movilidad_nombre.label("guia_movilidad_nombre"),
            Solicitud.guia_movilidad_ruta.label("guia_movilidad_ruta"),
            Solicitud.info_adicional_nombre.label("info_adicional_nombre"),
            Solicitud.info_adicional_ruta.label("info_adicional_ruta"),
            Solicitud.distancia_km.label("distancia_km"),
            Solicitud.tarifa_minima.label("tarifa_minima"),
            Solicitud.valor_referencia_campesino.label("valor_referencia_campesino"),
            func.count(func.distinct(SolicitudBovino.id)).label("cantidad_bovinos"),
            campesino.nombre.label("campesino_nombre"),
            campesino.apellido.label("campesino_apellido"),
            Vehiculo.id_vehiculo.label("vehiculo_id"),
            Vehiculo.placa.label("vehiculo_placa"),
            Vehiculo.marca.label("vehiculo_marca"),
            Vehiculo.modelo.label("vehiculo_modelo"),
            Vehiculo.tipo_vehiculo.label("vehiculo_tipo"),
        )
        .outerjoin(Solicitud, Solicitud.id == Viaje.solicitud_id)
        .outerjoin(SolicitudBovino, SolicitudBovino.solicitud_id == Viaje.solicitud_id)
        .outerjoin(campesino, campesino.id_usuario == Solicitud.id_usuario)
        .outerjoin(Vehiculo, Vehiculo.id_vehiculo == Viaje.id_vehiculo)
        .filter(Viaje.id_transportador == id_usuario)
    )

    if estado:
        query = query.filter(Viaje.estado == estado)
    if fecha:
        query = query.filter(Viaje.fecha == fecha)

    resultados = (
        query.group_by(
            Viaje.id,
            Viaje.solicitud_id,
            Viaje.origen,
            Viaje.destino,
            Viaje.fecha,
            Viaje.estado,
            Solicitud.codigo,
            Solicitud.guia_movilidad_nombre,
            Solicitud.guia_movilidad_ruta,
            Solicitud.info_adicional_nombre,
            Solicitud.info_adicional_ruta,
            Solicitud.distancia_km,
            Solicitud.tarifa_minima,
            Solicitud.valor_referencia_campesino,
            campesino.nombre,
            campesino.apellido,
            Vehiculo.id_vehiculo,
            Vehiculo.placa,
            Vehiculo.marca,
            Vehiculo.modelo,
            Vehiculo.tipo_vehiculo,
        )
        .order_by(Viaje.id.desc())
        .all()
    )

    resumen_bovinos = construir_resumen_bovinos_por_solicitud(
        db,
        [item.solicitud_id for item in resultados if item.solicitud_id is not None],
    )

    return [
        {
            "id": item.id,
            "id_viaje": item.id,
            "solicitud_id": item.solicitud_id,
            "solicitud_codigo": item.solicitud_codigo,
            "origen": item.origen,
            "destino": item.destino,
            "fecha": item.fecha,
            "estado": item.estado,
            "progreso": calcular_progreso(item.estado),
            "cantidad_bovinos": int(item.cantidad_bovinos or 0),
            "campesino_nombre": f"{item.campesino_nombre or ''} {item.campesino_apellido or ''}".strip(),
            "distancia_km": float(item.distancia_km or 0),
            "tarifa_minima": float(item.tarifa_minima or 0),
            "valor_referencia_campesino": float(item.valor_referencia_campesino or 0),
            "vehiculo_id": item.vehiculo_id,
            "vehiculo_placa": item.vehiculo_placa,
            "vehiculo_marca": item.vehiculo_marca,
            "vehiculo_modelo": item.vehiculo_modelo,
            "vehiculo_tipo": item.vehiculo_tipo,
            "guia_movilidad_nombre": item.guia_movilidad_nombre,
            "guia_movilidad_url": _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)["view"],
            "guia_movilidad_download_url": _doc_links(item.guia_movilidad_ruta, item.guia_movilidad_nombre)["download"],
            "info_adicional_nombre": item.info_adicional_nombre,
            "info_adicional_url": _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)["view"],
            "info_adicional_download_url": _doc_links(item.info_adicional_ruta, item.info_adicional_nombre)["download"],
            "bovinos": resumen_bovinos.get(item.solicitud_id, []),
        }
        for item in resultados
    ]


@router.get("/{id_usuario}/dashboard")
def dashboard_transportador(id_usuario: int, db: Session = Depends(get_db)):
    ensure_operational_schema(db)
    validar_transportador(db, id_usuario)

    viajes = db.query(Viaje).filter(Viaje.id_transportador == id_usuario).all()
    vehiculos = db.query(Vehiculo.id_vehiculo).filter(Vehiculo.id_usuario == id_usuario).count()

    asignados = sum(1 for viaje in viajes if viaje.estado == "Asignado")
    en_ruta = sum(1 for viaje in viajes if viaje.estado == "En ruta")
    completados = sum(1 for viaje in viajes if viaje.estado == "Completado")

    recientes = [
        {
            "id": viaje.id,
            "id_viaje": viaje.id,
            "solicitud_id": viaje.solicitud_id,
            "origen": viaje.origen,
            "destino": viaje.destino,
            "estado": viaje.estado,
            "fecha": viaje.fecha,
            "id_vehiculo": viaje.id_vehiculo,
        }
        for viaje in sorted(viajes, key=lambda item: item.id or 0, reverse=True)[:5]
    ]

    return {
        "viajes_asignados": asignados,
        "en_ruta": en_ruta,
        "completados": completados,
        "vehiculos": vehiculos,
        "total_viajes": len(viajes),
        "recientes": recientes,
    }


@router.patch("/viajes/{id_viaje}/estado")
def actualizar_estado_viaje_transportador(
    id_viaje: int,
    payload: CambiarEstadoViajePayload,
    db: Session = Depends(get_db),
):
    ensure_operational_schema(db)
    validar_transportador(db, payload.id_transportador)

    viaje = db.query(Viaje).filter(Viaje.id == id_viaje).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    if viaje.id_transportador != payload.id_transportador:
        raise HTTPException(status_code=403, detail="No puedes modificar un viaje de otro transportador")

    if payload.estado not in ESTADOS_VIAJE:
        raise HTTPException(status_code=400, detail="Estado de viaje no válido")

    estado_actual = ORDEN_ESTADOS_VIAJE.get(viaje.estado, -1)
    nuevo_estado = ORDEN_ESTADOS_VIAJE.get(payload.estado, -1)
    if nuevo_estado < estado_actual:
        raise HTTPException(status_code=400, detail="No puedes devolver el viaje a un estado anterior")

    viaje.estado = payload.estado
    db.add(viaje)

    solicitud = db.query(Solicitud).filter(Solicitud.id == viaje.solicitud_id).first()
    if solicitud:
        solicitud.estado = payload.estado
        db.add(solicitud)

        if payload.estado == "Completado":
            aplicar_reglas_finalizacion(db, solicitud)

    db.commit()
    db.refresh(viaje)

    return {
        "ok": True,
        "mensaje": "Estado del viaje actualizado correctamente",
        "estado": viaje.estado,
        "progreso": calcular_progreso(viaje.estado),
    }