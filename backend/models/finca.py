from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

class Finca(Base):
    __tablename__ = "finca"

    id_finca = Column(Integer, primary_key=True, index=True, autoincrement=True)
    municipio = Column(String, default="Zipaquira")
    vereda = Column(String)
    referencia = Column(String)
    nombre_finca = Column(String)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"))