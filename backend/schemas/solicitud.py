from typing import List, Literal, Optional
from pydantic import BaseModel


ESTADOS_SOLICITUD = (
    "Buscando conductor",
    "Negociando pago",
    "Asignado",
    "En ruta",
    "Completado",
    "Cancelada",
)


class SolicitudCreate(BaseModel):
    id_usuario: int
    tipo_solicitud: Literal["Venta", "Traslado de finca a finca", "Venta a frigorifico", "Feria ganadera"]
    origen: str
    destino: str
    fecha: Optional[str] = None
    hora_recogida: Optional[str] = None
    contacto_entrega: Optional[str] = None
    telefono_contacto: Optional[str] = None
    estado: Optional[str] = "Negociando pago"
    observaciones: Optional[str] = None
    observaciones_ganado: Optional[str] = None
    bovino_ids: List[int]
    id_finca_origen: Optional[int] = None
    id_finca_destino: Optional[int] = None
    destino_confirmado: Optional[bool] = False
    destino_rechazado: Optional[bool] = False
    vereda_origen: Optional[str] = None
    vereda_destino: Optional[str] = None
    valor_referencia_campesino: float


class SolicitudTransportadorAction(BaseModel):
    id_transportador: int
    id_vehiculo: Optional[int] = None


class CancelarSolicitudPayload(BaseModel):
    id_usuario: int


class CambiarEstadoViajePayload(BaseModel):
    id_transportador: int
    estado: Literal["Asignado", "En ruta", "Completado"]


class OfertaTransportadorPayload(BaseModel):
    id_transportador: int
    valor_oferta: float


class OfertaCampesinoPayload(BaseModel):
    id_usuario: int
    accion: Literal["aceptar", "rechazar", "contraofertar"]
    transportador_id: int
    valor_oferta: Optional[float] = None
