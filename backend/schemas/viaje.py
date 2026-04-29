from pydantic import BaseModel


class ViajeCreate(BaseModel):
    solicitud_id: int | None = None
    id_transportador: int | None = None
    id_vehiculo: int | None = None
    origen: str
    destino: str
    fecha: str
    estado: str = "Asignado"
