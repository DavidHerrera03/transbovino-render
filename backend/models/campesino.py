from sqlalchemy import Column, Integer, ForeignKey
from database import Base

class Campesino(Base):
    __tablename__ = "campesino"

    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), primary_key=True)
    id_bovino = Column(Integer, ForeignKey("bovino.id_bovino"), primary_key=True)