from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Finca(Base):
    __tablename__ = "finca"

    id_finca = Column(Integer, primary_key=True, index=True, autoincrement=True)
    municipio = Column(String(120), default="Zipaquira")
    vereda = Column(String(120))
    referencia = Column(String(255))
    nombre_finca = Column(String(150))
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"))