from pydantic import BaseModel


class FincaBase(BaseModel):
    nombre_finca: str
    municipio: str | None = "Zipaquira"
    vereda: str
    referencia: str


class FincaCreate(FincaBase):
    id_usuario: int


class FincaUpdate(FincaBase):
    id_usuario: int
