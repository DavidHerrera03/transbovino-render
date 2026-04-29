from pydantic import BaseModel


class VehiculoCreate(BaseModel):
    id_usuario: int
    tipo_vehiculo: str
    marca: str
    modelo: int
    peso_max_prom: float
    capacidad_bovinos: int
    descripcion: str
    placa: str
