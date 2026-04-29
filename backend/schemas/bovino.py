from pydantic import BaseModel
from typing import Optional


class BovinoBase(BaseModel):
    raza: str
    peso_promedio: float
    observaciones: str
    edad: int
    codigo_bovino: Optional[int] = None
    id_usuario: Optional[int] = None
    id_finca: Optional[int] = None
    estado: Optional[str] = "activo"


class BovinoCreate(BovinoBase):
    pass


class BovinoUpdate(BaseModel):
    raza: Optional[str] = None
    peso_promedio: Optional[float] = None
    observaciones: Optional[str] = None
    edad: Optional[int] = None
    codigo_bovino: Optional[int] = None
    id_usuario: Optional[int] = None
    id_finca: Optional[int] = None
    estado: Optional[str] = None


class BovinoOut(BovinoBase):
    id_bovino: int

    class Config:
        from_attributes = True