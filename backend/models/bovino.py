from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from database import Base


class Bovino(Base):
    __tablename__ = "bovino"

    id_bovino = Column(Integer, primary_key=True, index=True)
    raza = Column(Text, nullable=False)
    peso_promedio = Column(Float, nullable=False)
    observaciones = Column(Text, nullable=False)
    edad = Column(Integer, nullable=False)
    codigo_bovino = Column(Integer, nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    id_finca = Column(Integer, ForeignKey("finca.id_finca"), nullable=True)
    estado = Column(String(30), nullable=False, default="activo")


class DocumentacionBovino(Base):
    __tablename__ = "documentacion_bovino"

    id = Column(Integer, primary_key=True, index=True)
    id_bovino = Column(Integer, ForeignKey("bovino.id_bovino"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(500), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
