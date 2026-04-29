from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True)
    nombre = Column(String(100))
    apellido = Column(String(100))
    correo = Column(String(150))
    telefono = Column(String(30))
    rol = Column(String(50))
    password = Column(String(255))
    estado = Column(String(30), default="activo")
    reset_token = Column(String(255), nullable=True)
    reset_token_expira = Column(DateTime, nullable=True)