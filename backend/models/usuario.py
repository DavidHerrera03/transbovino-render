from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True)
    nombre = Column(String)
    apellido = Column(String)
    correo = Column(String)
    telefono = Column(String)
    rol = Column(String)
    password = Column(String)
    estado = Column(String, default="activo")
    reset_token = Column(String, nullable=True)
    reset_token_expira = Column(DateTime, nullable=True)
