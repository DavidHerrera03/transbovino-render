from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float, Text, func
from database import Base


class Vehiculo(Base):
    __tablename__ = "vehiculo"

    id_vehiculo = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    tipo_vehiculo = Column(String(120), nullable=False)
    marca = Column(String(120), nullable=False)
    modelo = Column(Integer, nullable=False)
    peso_max_prom = Column(Float, nullable=False)
    capacidad_bovinos = Column(Integer, nullable=False)
    descripcion = Column(Text, nullable=False)
    placa = Column(String(20), nullable=False)


class DocumentacionVehiculo(Base):
    __tablename__ = "documentacion_vehiculo"

    id = Column(Integer, primary_key=True, index=True)
    id_vehiculo = Column(Integer, ForeignKey("vehiculo.id_vehiculo"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(500), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
