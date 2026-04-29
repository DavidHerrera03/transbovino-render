from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Boolean, Float, func
from database import Base


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), nullable=True)
    tipo_solicitud = Column(String(50), nullable=False, default="Venta")
    origen = Column(String(255), nullable=False)
    destino = Column(String(255), nullable=False)
    fecha = Column(String(50), nullable=True)
    hora_recogida = Column(String(20), nullable=True)
    contacto_entrega = Column(String(120), nullable=True)
    telefono_contacto = Column(String(30), nullable=True)
    estado = Column(String(50), default="Buscando conductor")
    observaciones = Column(Text, nullable=True)
    observaciones_ganado = Column(Text, nullable=True)
    guia_movilidad_nombre = Column(String(255), nullable=False)
    guia_movilidad_ruta = Column(Text, nullable=False)
    info_adicional_nombre = Column(String(255), nullable=True)
    info_adicional_ruta = Column(Text, nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_transportador = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    id_vehiculo = Column(Integer, ForeignKey("vehiculo.id_vehiculo"), nullable=True)
    id_finca_origen = Column(Integer, ForeignKey("finca.id_finca"), nullable=True)
    id_finca_destino = Column(Integer, ForeignKey("finca.id_finca"), nullable=True)
    destino_confirmado = Column(Boolean, nullable=False, default=False)
    destino_rechazado = Column(Boolean, nullable=False, default=False)
    destino_es_tercero = Column(Boolean, nullable=False, default=False)
    accion_bovino = Column(String(30), nullable=True)
    vereda_origen = Column(String(120), nullable=True)
    vereda_destino = Column(String(120), nullable=True)
    distancia_km = Column(Float, nullable=True)
    tarifa_minima = Column(Float, nullable=True)
    valor_referencia_campesino = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SolicitudBovino(Base):
    __tablename__ = "solicitud_bovino"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"), nullable=False)
    bovino_id = Column(Integer, ForeignKey("bovino.id_bovino"), nullable=False)


class SolicitudRechazo(Base):
    __tablename__ = "solicitud_rechazo"
    __table_args__ = (
        UniqueConstraint("solicitud_id", "transportador_id", name="uq_solicitud_transportador"),
    )

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"), nullable=False)
    transportador_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class SolicitudOferta(Base):
    __tablename__ = "solicitud_oferta"
    __table_args__ = (
        UniqueConstraint("solicitud_id", "transportador_id", name="uq_solicitud_oferta_transportador"),
    )

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"), nullable=False)
    transportador_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    valor_oferta = Column(Float, nullable=False)
    estado = Column(String(40), nullable=False, default="pendiente_transportador")
    propuesta_por = Column(String(20), nullable=False, default="campesino")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
