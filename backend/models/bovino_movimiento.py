from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from database import Base


class BovinoMovimiento(Base):
    __tablename__ = "bovino_movimiento"

    id = Column(Integer, primary_key=True, index=True)
    id_bovino = Column(Integer, ForeignKey("bovino.id_bovino"), nullable=False)
    tipo_movimiento = Column(
        Enum("registro", "traslado", "venta", "feria", "frigorifico", name="tipo_movimiento_enum"),
        nullable=False
    )
    id_usuario_origen = Column(Integer, nullable=True)
    id_usuario_destino = Column(Integer, nullable=True)
    id_finca_origen = Column(Integer, nullable=True)
    id_finca_destino = Column(Integer, nullable=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"), nullable=True)
    fecha = Column(DateTime, server_default=func.current_timestamp())
    observacion = Column(Text, nullable=True)