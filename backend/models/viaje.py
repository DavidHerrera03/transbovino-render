from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from database import Base


class Viaje(Base):
    __tablename__ = "viajes"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"), nullable=True)
    id_transportador = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    id_vehiculo = Column(Integer, ForeignKey("vehiculo.id_vehiculo"), nullable=True)
    origen = Column(String(255))
    destino = Column(String(255))
    fecha = Column(String(50))
    estado = Column(String(50), default="Asignado")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
