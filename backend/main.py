import os

from utils.env_loader import load_project_env

load_project_env()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, SessionLocal

# Importar modelos para que SQLAlchemy conozca todas las tablas
from models import (
    usuario,
    bovino,
    bovino_movimiento,
    finca,
    solicitud,
    vehiculo,
    viaje,
)

from routers.auth import router as auth_router
from routers import admin
from routers import bovino as bovino_router
from routers import solicitud as solicitud_router
from routers import transportador
from routers import usuario as usuario_router
from routers import vehiculo as vehiculo_router
from routers import finca as finca_router

from utils.db_schema import ensure_operational_schema

app = FastAPI(title="TransBovino API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def crear_tablas():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        ensure_operational_schema(db)
    finally:
        db.close()


@app.get("/")
def home():
    return {"mensaje": "API funcionando"}


@app.get("/setup-db")
def setup_db():
    crear_tablas()
    return {"mensaje": "Tablas creadas correctamente"}


app.include_router(auth_router)
app.include_router(bovino_router.router)
app.include_router(usuario_router.router)
app.include_router(vehiculo_router.router)
app.include_router(solicitud_router.router)
app.include_router(transportador.router)
app.include_router(finca_router.router)
app.include_router(admin.router)